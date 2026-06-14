use if_addrs::{get_if_addrs, IfAddr};
use regex::Regex;
use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::net::{Ipv4Addr, SocketAddr, TcpStream};
use std::sync::{Mutex, OnceLock};
#[cfg(target_os = "macos")]
use std::process::Command;
#[cfg(target_os = "windows")]
use std::process::Command;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tungstenite::{connect, Message};

// Chave de autenticação do app compilada em tempo de build via AX_API_KEY env var.
// Build: AX_API_KEY=axcontrol_app_key_2026_06_14_v1 npm run tauri build
const AX_API_KEY: &str = match option_env!("AX_API_KEY") {
    Some(key) => key,
    None => "",
};

#[derive(Debug, Clone, Copy)]
struct WsProbeCacheEntry {
    channels: Option<u16>,
    updated_at_ms: u64,
}

static WS_PROBE_CACHE: OnceLock<Mutex<HashMap<String, WsProbeCacheEntry>>> = OnceLock::new();

const WS_PROBE_CACHE_TTL_HIT_MS: u64 = 10 * 60 * 1000;
const WS_PROBE_CACHE_TTL_MISS_MS: u64 = 90 * 1000;

fn now_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn get_cached_ws_probe_channels(ip: &str) -> Option<Option<u16>> {
    let cache = WS_PROBE_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    let guard = cache.lock().ok()?;
    let entry = guard.get(ip)?;

    let ttl = if entry.channels.is_some() {
        WS_PROBE_CACHE_TTL_HIT_MS
    } else {
        WS_PROBE_CACHE_TTL_MISS_MS
    };

    if now_unix_ms().saturating_sub(entry.updated_at_ms) <= ttl {
        return Some(entry.channels);
    }

    None
}

fn set_cached_ws_probe_channels(ip: &str, channels: Option<u16>) {
    let cache = WS_PROBE_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    if let Ok(mut guard) = cache.lock() {
        guard.insert(
            ip.to_string(),
            WsProbeCacheEntry {
                channels,
                updated_at_ms: now_unix_ms(),
            },
        );
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiscoveredMixer {
    id: String,
    name: String,
    ip: String,
    mac_address: Option<String>,
    model: Option<String>,
    channels: Option<u16>,
    status: String,
    source: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LicenseValidatePayload {
    license_key: String,
    series: String,
    device_id: String,
    device_name: String,
    platform: String,
    app_version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseValidateResponse {
    status_code: u16,
    body: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LicenseApiRequestPayload {
    method: String,
    url: String,
    body: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseApiResponse {
    status_code: u16,
    body: serde_json::Value,
    raw_body: String,
}

static LICENSE_HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn license_http_client() -> Result<&'static reqwest::Client, String> {
    if let Some(client) = LICENSE_HTTP_CLIENT.get() {
        return Ok(client);
    }

    let mut default_headers = HeaderMap::new();
    if !AX_API_KEY.is_empty() {
        if let Ok(value) = HeaderValue::from_str(AX_API_KEY) {
            default_headers.insert("X-AX-App-Key", value);
        }
    }

    let client = reqwest::Client::builder()
        .cookie_store(true)
        .timeout(Duration::from_secs(15))
        .default_headers(default_headers)
        .build()
        .map_err(|error| format!("client build error: {error}"))?;

    let _ = LICENSE_HTTP_CLIENT.set(client);
    LICENSE_HTTP_CLIENT
        .get()
        .ok_or_else(|| "failed to initialize license http client".to_string())
}

fn strip_html(value: &str) -> String {
    let tag_regex = Regex::new(r"<[^>]+>").expect("valid html tag regex");

    tag_regex
        .replace_all(value, " ")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn is_generic_mixer_name(name: &str) -> bool {
    let normalized = name.trim().to_ascii_uppercase();
    normalized == "MIXER" || normalized == "MIXER AXIOS" || normalized == "MIXERAXIOS"
}

fn infer_model_and_channels(name: &str) -> (Option<String>, Option<u16>) {
    let normalized = name.to_ascii_uppercase();
    let axios_regex = Regex::new(r"AXIOS\s*(\d+)([A-Z0-9_-]*)").expect("valid axios model regex");

    if let Some(captures) = axios_regex.captures(&normalized) {
        let mut channels = captures
            .get(1)
            .and_then(|value| value.as_str().parse::<u16>().ok());

        // Normalize detected channels: remove DIGI (2 stereo channels)
        if let Some(ch) = channels {
            channels = Some(normalize_detected_channels(ch));
        }

        return (Some(normalized), channels);
    }

    if normalized.contains("AXIOS32") {
        return (Some("Axios 32".to_string()), Some(32));
    }

    if normalized.contains("AXIOS24") {
        return (Some("Axios 24".to_string()), Some(24));
    }

    if normalized.contains("AXIOS16E") {
        return (Some("AXIOS16E".to_string()), Some(16));
    }

    if normalized.contains("AXIOS16") {
        return (Some("Axios 16".to_string()), Some(16));
    }

    (None, None)
}

fn normalize_detected_channels(channels: u16) -> u16 {
    // Mesa reporta: 18 (AX16+DIGI), 26 (AX24+DIGI), 34 (AX32+DIGI)
    // App usa apenas os canais sem DIGI
    match channels {
        18 => 16,  // AX16 + 2 DIGI stereo
        26 => 24,  // AX24 + 2 DIGI stereo
        34 => 32,  // AX32 + 2 DIGI stereo
        _ => channels,  // Passa como está se não reconhecer
    }
}

fn parse_finder_html(html: &str) -> Vec<DiscoveredMixer> {
    let row_regex = Regex::new(
        r"(?is)<tr[^>]*>\s*<td[^>]*>\s*.*?\s*</td>\s*<td[^>]*>\s*(?P<name>.*?)\s*</td>\s*<td[^>]*>\s*(?P<ip>(?:\d{1,3}\.){3}\d{1,3})\s*</td>.*?</tr>",
    )
    .expect("valid finder row regex");

    row_regex
        .captures_iter(html)
        .filter_map(|captures| {
            let raw_name = captures.name("name")?.as_str();
            let ip = captures.name("ip")?.as_str().trim().to_string();
            let name = strip_html(raw_name);

            if name.is_empty() || ip.is_empty() {
                return None;
            }

            let (model, channels) = infer_model_and_channels(&name);

            Some(DiscoveredMixer {
                id: format!("finder:{ip}"),
                name,
                ip,
                mac_address: None,
                model,
                channels,
                status: "online".to_string(),
                source: "finder".to_string(),
            })
        })
        .collect()
}

fn parse_ipv4_from_ping_output(output: &str) -> Option<String> {
    let paren_or_bracket_regex = Regex::new(
        r"(?m)[\(\[](?P<ip>(?:\d{1,3}\.){3}\d{1,3})[\)\]]",
    )
    .expect("valid ping ip regex");

    if let Some(ip) = paren_or_bracket_regex
        .captures(output)
        .and_then(|captures| captures.name("ip"))
        .map(|value| value.as_str().to_string())
    {
        return Some(ip);
    }

    let fallback_ipv4_regex = Regex::new(r"(?m)(?P<ip>(?:\d{1,3}\.){3}\d{1,3})")
        .expect("valid fallback ping ip regex");

    fallback_ipv4_regex
        .captures(output)
        .and_then(|captures| captures.name("ip"))
        .map(|value| value.as_str().to_string())
}

fn normalize_mac_address(raw: &str) -> Option<String> {
    let token = raw
        .split_whitespace()
        .find(|value| value.contains(':') || value.contains('-'))?
        .trim_matches(|ch: char| !ch.is_ascii_hexdigit() && ch != ':' && ch != '-');

    let parts: Vec<&str> = token.split([':', '-']).collect();
    if parts.len() != 6 {
        return None;
    }

    let mut normalized_parts = Vec::with_capacity(6);

    for part in parts {
        if part.is_empty() || part.len() > 2 || !part.chars().all(|ch| ch.is_ascii_hexdigit()) {
            return None;
        }

        let value = u8::from_str_radix(part, 16).ok()?;
        normalized_parts.push(format!("{:02X}", value));
    }

    Some(normalized_parts.join(":"))
}

#[cfg(target_os = "macos")]
fn resolve_mac_from_arp(ip: &str) -> Option<String> {
    let output = Command::new("arp")
        .args(["-n", ip])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines() {
        if !line.contains(ip) {
            continue;
        }

        if let Some((_, right_side)) = line.split_once(" at ") {
            if right_side.to_ascii_lowercase().contains("incomplete") {
                return None;
            }

            if let Some(mac) = normalize_mac_address(right_side) {
                return Some(mac);
            }
        }
    }

    None
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn resolve_mac_from_arp(_ip: &str) -> Option<String> {
    None
}

#[cfg(target_os = "windows")]
fn resolve_mac_from_arp(ip: &str) -> Option<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let output = Command::new("arp")
        .args(["-a", ip])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines() {
        if !line.contains(ip) {
            continue;
        }

        if let Some(mac) = normalize_mac_address(line) {
            return Some(mac);
        }
    }

    None
}

#[cfg(target_os = "macos")]
fn resolve_finder_ip() -> Option<String> {
    let output = Command::new("ping")
        .args(["-c", "1", "findmixer.local"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    parse_ipv4_from_ping_output(&String::from_utf8_lossy(&output.stdout))
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn resolve_finder_ip() -> Option<String> {
    None
}

#[cfg(target_os = "windows")]
fn resolve_finder_ip() -> Option<String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let output = Command::new("ping")
        .args(["-n", "1", "findmixer.local"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_ipv4_from_ping_output(&stdout)
}

async fn fetch_finder_html() -> Result<Option<String>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(1600))
        .build()
        .map_err(|error| error.to_string())?;

    let mut urls = vec![
        "http://findmixer.local:8080/".to_string(),
        "http://findmixer.local/".to_string(),
    ];

    if let Some(ip) = resolve_finder_ip() {
      urls.push(format!("http://{ip}:8080/"));
      urls.push(format!("http://{ip}/"));
    }

    for url in urls {
        let response = match client.get(&url).send().await {
            Ok(response) => response,
            Err(_) => continue,
        };

        if !response.status().is_success() {
            continue;
        }

        let html = response.text().await.map_err(|error| error.to_string())?;

        if html.contains("Device Name") || html.contains("IP Address") {
            return Ok(Some(html));
        }
    }

    Ok(None)
}

#[derive(Debug, Clone, Copy)]
struct ProbeNetwork {
    local_ip: Ipv4Addr,
    network_ip: Ipv4Addr,
    prefix_len: u8,
}

fn ipv4_to_u32(ip: Ipv4Addr) -> u32 {
    u32::from(ip)
}

fn ipv4_mask_from_prefix(prefix_len: u8) -> u32 {
    if prefix_len == 0 {
        return 0;
    }

    (!0u32) << (32 - prefix_len.min(32) as u32)
}

fn ip_matches_probe_network(ip: Ipv4Addr, network: ProbeNetwork) -> bool {
    let mask = ipv4_mask_from_prefix(network.prefix_len);
    (ipv4_to_u32(ip) & mask) == (ipv4_to_u32(network.network_ip) & mask)
}

fn collect_private_probe_networks() -> Vec<ProbeNetwork> {
    let mut networks = Vec::<ProbeNetwork>::new();

    if let Ok(ifaces) = get_if_addrs() {
        for iface in ifaces {
            let IfAddr::V4(v4) = iface.addr else {
                continue;
            };

            if v4.ip.is_loopback() || !v4.ip.is_private() {
                continue;
            }

            let prefix_len = v4.netmask.octets().iter().map(|byte| byte.count_ones() as u8).sum();
            let network_ip = Ipv4Addr::from(ipv4_to_u32(v4.ip) & ipv4_to_u32(v4.netmask));

            networks.push(ProbeNetwork {
                local_ip: v4.ip,
                network_ip,
                prefix_len,
            });
        }
    }

    let mut dedup = HashMap::<String, ()>::new();
    networks
        .into_iter()
        .filter(|network| {
            let key = format!("{}-{}/{}", network.network_ip, network.local_ip, network.prefix_len);
            dedup.insert(key, ()).is_none()
        })
        .collect()
}

fn is_ws_port_open(ip: &str, timeout_ms: u64) -> bool {
    let address: SocketAddr = match format!("{ip}:8088").parse() {
        Ok(address) => address,
        Err(_) => return false,
    };

    TcpStream::connect_timeout(&address, Duration::from_millis(timeout_ms)).is_ok()
}

fn duonn_crc16_modbus(data: &[u8]) -> u16 {
    let mut crc: u16 = 0xFFFF;

    for byte in data {
        crc ^= *byte as u16;

        for _ in 0..8 {
            if (crc & 1) != 0 {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }

    crc
}

fn build_read_params_packet(params: &[u16]) -> Vec<u8> {
    let mut payload = Vec::<u8>::with_capacity(params.len() * 2);

    for param in params {
        payload.push((param >> 8) as u8);
        payload.push((param & 0x00FF) as u8);
    }

    let mut data = Vec::<u8>::with_capacity(payload.len() + 5);
    data.push(128);
    data.push((3 + payload.len()) as u8);
    data.push(6);
    data.extend_from_slice(&payload);

    let crc = duonn_crc16_modbus(&data);
    data.push((crc >> 8) as u8);
    data.push((crc & 0x00FF) as u8);

    data
}

fn decode_read_params_response(buffer: &[u8]) -> Vec<u16> {
    if buffer.len() < 9 || buffer[0] != 128 {
        if buffer.len() < 9 {
            eprintln!("[DECODE] Buffer too short: {} bytes", buffer.len());
        } else {
            eprintln!("[DECODE] Invalid frame marker: {} (expected 128)", buffer[0]);
        }
        return Vec::new();
    }

    let expected_len = buffer[1] as usize + 2;
    if expected_len > buffer.len() || buffer[2] != 6 {
        if expected_len > buffer.len() {
            eprintln!("[DECODE] Frame length mismatch: expected {}, have {}", expected_len, buffer.len());
        } else {
            eprintln!("[DECODE] Invalid opcode: {} (expected 6)", buffer[2]);
        }
        return Vec::new();
    }

    let mut params = Vec::<u16>::new();
    let frame = &buffer[..expected_len];

    let mut index = 3usize;
    while index + 3 < frame.len().saturating_sub(2) {
        let param = ((frame[index] as u16) << 8) | frame[index + 1] as u16;
        params.push(param);
        index += 4;
    }

    eprintln!("[DECODE] Extracted {} params: {:?}", params.len(), params);
    params
}

fn probe_channel_capacity_via_ws(ip: &str, timeout_ms: u64) -> Option<u16> {
    let request = format!("ws://{ip}:8088/");
    eprintln!("[PROBE] Connecting to {}", request);
    let (mut socket, _) = connect(request.as_str()).ok()?;
    eprintln!("[PROBE] Connected! Sending sentinel params...");

    // Sentinelas por modelo:
    // - AX16/24: 74 (CH1), 1066 (faixa CH17), 1500 (faixa CH24)
    // - AX32: 4634/4743 (master faders), 4649/4758 (master EQ enable L/R)
    let packet = build_read_params_packet(&[74, 1066, 1500, 4634, 4743, 4649, 4758]);
    socket.send(Message::Binary(packet.into())).ok()?;
    eprintln!("[PROBE] Packet sent, waiting for responses (timeout={}ms)...", timeout_ms);

    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    let mut observed_params = HashSet::<u16>::new();
    let mut read_count = 0u32;

    let classify = |hits: &HashSet<u16>| -> Option<u16> {
        let ax32_sentinels = [4634u16, 4743u16, 4649u16, 4758u16];
        let ax24_sentinels = [1066u16, 1500u16];
        let ax16_sentinel = 74u16;

        let ax32_hits = ax32_sentinels
            .iter()
            .filter(|param| hits.contains(param))
            .count();
        let ax24_hits = ax24_sentinels
            .iter()
            .filter(|param| hits.contains(param))
            .count();
        let has_ax16 = hits.contains(&ax16_sentinel);

        // Classificacao permissiva para discovery rapido (com timeout curto).
        let has_ax32 = ax32_hits >= 2;
        let has_ax24 = ax24_hits >= 1;

        // Se múltiplos modelos responderam, usa o MAIOR (hierarquia: AX32 > AX24 > AX16)
        // para resolver ambiguidade. Isso é válido porque a mesa AXIOS apenas tem
        // os parâmetros do seu próprio modelo.
        if has_ax32 {
            eprintln!("[PROBE] AX32 detected (34 channels with DIGI) - {} sentinels matched", ax32_hits);
            return Some(34); // 32 + 2 DIGI stereo
        }

        if has_ax24 {
            eprintln!("[PROBE] AX24 detected (26 channels with DIGI) - {} sentinels matched", ax24_hits);
            return Some(26); // 24 + 2 DIGI stereo
        }

        if has_ax16 {
            eprintln!("[PROBE] AX16 detected (18 channels with DIGI)");
            return Some(18); // 16 + 2 DIGI stereo
        }

        None
    };

    while Instant::now() < deadline {
        let message = match socket.read() {
            Ok(message) => message,
            Err(e) => {
                eprintln!("[PROBE] Socket read error: {:?}", e);
                break;
            }
        };

        read_count += 1;
        let payload = match message {
            Message::Binary(data) => {
                eprintln!("[PROBE] Read #{}: Got binary payload ({} bytes)", read_count, data.len());
                data
            },
            Message::Close(_) => {
                eprintln!("[PROBE] Socket closed by remote");
                break;
            },
            _ => {
                eprintln!("[PROBE] Read #{}: Got non-binary message (ignoring)", read_count);
                continue;
            }
        };

        let decoded = decode_read_params_response(&payload);
        eprintln!("[PROBE] Decoded {} params from payload", decoded.len());
        
        if decoded.is_empty() {
            eprintln!("[PROBE] Decode returned empty (payload may be invalid)");
            continue;
        }

        for param in decoded {
            eprintln!("[PROBE]   - Observed param: {}", param);
            observed_params.insert(param);
        }
        
        eprintln!("[PROBE] Total observed params so far: {:?}", observed_params);

        if let Some(channels) = classify(&observed_params) {
            let _ = socket.close(None);
            eprintln!("[PROBE] returning {}", channels);
            return Some(channels);
        }
    }

    eprintln!("[PROBE] Timeout! Total reads: {}, observed params: {:?}", read_count, observed_params);

    let result = classify(&observed_params);
    let _ = socket.close(None);
    eprintln!("[PROBE] final result: {:?}", result);
    result
}

fn model_name_from_channels(channels: u16) -> Option<String> {
    match channels {
        16 => Some("AXIOS16".to_string()),
        24 => Some("AXIOS24".to_string()),
        32 => Some("AXIOS32".to_string()),
        _ => None,
    }
}

fn resolve_channels_from_identity_or_probe(
    identity_name: &str,
    current_channels: Option<u16>,
    probed_channels: Option<u16>,
) -> Option<u16> {
    let (_, inferred_channels) = infer_model_and_channels(identity_name);
    let identity_channels = current_channels.or(inferred_channels);

    eprintln!("[RESOLVE_CHANNELS] name={} identity={:?} probed={:?}", identity_name, identity_channels, probed_channels);

    // Probe WebSocket é a FONTE DE VERDADE (autoridade obrigatória)
    // Se probe tem resultado, usa diretamente sem scoring ou ambiguidade
    if let Some(probed) = probed_channels {
        eprintln!("[RESOLVE_CHANNELS] USING PROBE (authoritative): {}", probed);
        return Some(normalize_detected_channels(probed));
    }

    // Se probe falhou, fallback para identidade (nome do device)
    let result = identity_channels.map(normalize_detected_channels);
    eprintln!("[RESOLVE_CHANNELS] probe failed, using identity fallback");

    result
}

fn build_local_probe_ips(preferred_ips: &[String]) -> Vec<String> {
    let private_networks = collect_private_probe_networks();
    let mut ordered: Vec<String> = vec![
        // Known current/default Axios control IPs on the mixer LAN.
        "172.14.52.1".to_string(),
        "172.14.51.1".to_string(),
        "172.14.30.1".to_string(),
        "192.168.1.75".to_string(),
        "192.168.0.75".to_string(),
        "10.0.0.75".to_string(),
    ];

    let mut preferred_ordered: Vec<String> = Vec::new();
    for preferred in preferred_ips {
        let parsed = match preferred.trim().parse::<Ipv4Addr>() {
            Ok(parsed) => parsed,
            Err(_) => continue,
        };

        if !parsed.is_private() {
            continue;
        }

        let should_include = if private_networks.is_empty() {
            true
        } else {
            private_networks
                .iter()
                .any(|network| ip_matches_probe_network(parsed, *network))
        };

        if should_include {
            preferred_ordered.push(parsed.to_string());
        }
    }

    preferred_ordered.extend(ordered);
    ordered = preferred_ordered;

    let common_hosts = [1, 2, 10, 20, 30, 40, 50, 60, 70, 75, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250];

    for network in &private_networks {
        let network_octets = network.network_ip.octets();
        let local_octets = network.local_ip.octets();

        if network.prefix_len >= 24 {
            // Same /24: prioritize common host endings before full sweep.
            for host in common_hosts {
                ordered.push(format!("{}.{}.{}.{}", network_octets[0], network_octets[1], network_octets[2], host));
            }

            for host in 1..=254 {
                ordered.push(format!("{}.{}.{}.{}", network_octets[0], network_octets[1], network_octets[2], host));
            }
            continue;
        }

        if network.prefix_len >= 16 {
            // Broader local LAN: prioritize the local /24 and common host endings.
            for host in 1..=254 {
                ordered.push(format!("{}.{}.{}.{}", local_octets[0], local_octets[1], local_octets[2], host));
            }

            for host in common_hosts {
                ordered.push(format!("{}.{}.{}.{}", local_octets[0], local_octets[1], local_octets[2], host));
            }
            continue;
        }

        // Very broad private ranges: use the local /24 and the common host endings.
        for host in 1..=254 {
            ordered.push(format!("{}.{}.{}.{}", local_octets[0], local_octets[1], local_octets[2], host));
        }

        for host in common_hosts {
            ordered.push(format!("{}.{}.{}.{}", local_octets[0], local_octets[1], local_octets[2], host));
        }
    }

    // iOS can intermittently fail to expose the expected private interface/netmask.
    // When that happens, probe common host endings on known subnets to keep discovery responsive.
    if private_networks.is_empty() {
        let fallback_subnets = [
            (172u8, 14u8, 52u8),
            (172u8, 14u8, 51u8),
            (172u8, 14u8, 30u8),
            (192u8, 168u8, 1u8),
            (192u8, 168u8, 0u8),
            (10u8, 0u8, 0u8),
        ];

        for (a, b, c) in fallback_subnets {
            for host in common_hosts {
                ordered.push(format!("{}.{}.{}.{}", a, b, c, host));
            }
        }
    }

    let mut dedup = HashMap::<String, ()>::new();
    ordered
        .into_iter()
        .filter(|ip| dedup.insert(ip.clone(), ()).is_none())
        .collect()
}

fn infer_name_from_html(html: &str) -> Option<String> {
    let normalized = html.to_ascii_uppercase();
    let model_regex = Regex::new(r"AXIOS\s*\d+[A-Z0-9_-]*").expect("valid axios finder regex");

    model_regex
        .find(&normalized)
        .map(|matched| matched.as_str().trim().to_string())
}

async fn read_probe_snippet(mut response: reqwest::Response) -> Option<String> {
    const MAX_BYTES: usize = 24 * 1024;
    const MAX_CHUNKS: usize = 8;

    let mut buffer = Vec::<u8>::new();
    let mut chunks = 0usize;

    while chunks < MAX_CHUNKS && buffer.len() < MAX_BYTES {
        let next = response.chunk().await.ok().flatten();
        let Some(chunk) = next else {
            break;
        };

        let remaining = MAX_BYTES.saturating_sub(buffer.len());
        if remaining == 0 {
            break;
        }

        let take = chunk.len().min(remaining);
        buffer.extend_from_slice(&chunk[..take]);
        chunks += 1;

        let preview = String::from_utf8_lossy(&buffer).to_ascii_uppercase();
        if preview.contains("AXIOS") || preview.contains("MIXER") || preview.contains("<TITLE") {
            break;
        }
    }

    if buffer.is_empty() {
        return None;
    }

    Some(String::from_utf8_lossy(&buffer).to_string())
}

async fn probe_mixer_ip(
    client: &reqwest::Client,
    ip: &str,
    open_timeout_ms: u64,
) -> Option<DiscoveredMixer> {
    let ws_online = is_ws_port_open(ip, open_timeout_ms);
    let allow_http_only_fallback = ip.trim().ends_with(".75");

    if !ws_online && !allow_http_only_fallback {
        return None;
    }

    let probed_channels = if ws_online {
        if let Some(cached) = get_cached_ws_probe_channels(ip) {
            cached
        } else {
            // Probe WS curto e com cooldown via cache por IP para evitar travar a mesa.
            let channels = probe_channel_capacity_via_ws(ip, 280);
            set_cached_ws_probe_channels(ip, channels);
            channels
        }
    } else {
        None
    };

    let urls = [format!("http://{ip}:8080/"), format!("http://{ip}/")];

    for url in urls {
        let response = match client
            .get(&url)
            .timeout(Duration::from_millis(1200))
            .send()
            .await
        {
            Ok(response) => response,
            Err(_) => continue,
        };

        if !response.status().is_success() {
            continue;
        }

        let html = match read_probe_snippet(response).await {
            Some(html) => html,
            None => continue,
        };
        let parsed_rows = parse_finder_html(&html);

        if !parsed_rows.is_empty() {
            if let Some(exact) = parsed_rows.iter().find(|mixer| mixer.ip == ip) {
                let mut exact_with_status = exact.clone();
                let resolved_channels = resolve_channels_from_identity_or_probe(
                    &exact_with_status.name,
                    exact_with_status.channels,
                    probed_channels,
                );
                exact_with_status.channels = resolved_channels;

                if exact_with_status.model.is_none() {
                    exact_with_status.model = resolved_channels.and_then(model_name_from_channels);
                }

                if is_generic_mixer_name(&exact_with_status.name) {
                    if let Some(channels) = resolved_channels {
                        exact_with_status.name = format!("AXIOS{channels}");
                    }
                }
                exact_with_status.status = if ws_online {
                    "online".to_string()
                } else {
                    "unknown".to_string()
                };
                return Some(exact_with_status);
            }
        }

        let Some(inferred_name) = infer_name_from_html(&html) else {
            continue;
        };

        let (model, channels) = infer_model_and_channels(&inferred_name);
        let resolved_channels =
            resolve_channels_from_identity_or_probe(&inferred_name, channels, probed_channels);
        let resolved_name = if is_generic_mixer_name(&inferred_name) {
            resolved_channels
                .map(|value| format!("AXIOS{value}"))
                .unwrap_or(inferred_name)
        } else {
            inferred_name
        };

        return Some(DiscoveredMixer {
            id: format!("probe:{ip}"),
            name: resolved_name,
            ip: ip.to_string(),
            mac_address: resolve_mac_from_arp(ip),
            model: model.or_else(|| resolved_channels.and_then(model_name_from_channels)),
            channels: resolved_channels,
            status: if ws_online {
                "online".to_string()
            } else {
                "unknown".to_string()
            },
            source: "manual".to_string(),
        });
    }

    if !ws_online {
        return None;
    }

    let resolved_channels = probed_channels;

    Some(DiscoveredMixer {
        id: format!("probe:{ip}"),
        name: resolved_channels
            .map(|channels| format!("AXIOS{channels}"))
            .unwrap_or_else(|| "Mixer Axios".to_string()),
        ip: ip.to_string(),
        mac_address: resolve_mac_from_arp(ip),
        model: resolved_channels.and_then(model_name_from_channels),
        channels: resolved_channels,
        status: "online".to_string(),
        source: "manual".to_string(),
    })
}

async fn discover_mixers_by_local_probe(preferred_ips: Option<Vec<String>>) -> Result<Vec<DiscoveredMixer>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(300))
        .build()
        .map_err(|error| error.to_string())?;

    let preferred = preferred_ips.unwrap_or_default();
    let candidates = build_local_probe_ips(&preferred);
    if candidates.is_empty() {
        return Ok(Vec::new());
    }

    let mut found = HashMap::<String, DiscoveredMixer>::new();

    // Single fast pass: keeps discovery responsive and works well with periodic refresh.
    for chunk in candidates.chunks(8) {
        let mut handles = Vec::with_capacity(chunk.len());

        for ip in chunk {
            let probe_client = client.clone();
            let probe_ip = ip.clone();
            handles.push(tauri::async_runtime::spawn(async move {
                probe_mixer_ip(&probe_client, &probe_ip, 170).await
            }));
        }

        for handle in handles {
            if let Ok(Some(mixer)) = handle.await {
                found.entry(mixer.ip.clone()).or_insert(mixer);
            }
        }
    }

    Ok(found.into_values().collect())
}

async fn discover_mixers_by_preferred_ips(preferred_ips: &[String]) -> Result<Vec<DiscoveredMixer>, String> {
    if preferred_ips.is_empty() {
        return Ok(Vec::new());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(280))
        .build()
        .map_err(|error| error.to_string())?;

    let mut dedup = HashMap::<String, ()>::new();
    let candidates: Vec<String> = preferred_ips
        .iter()
        .filter_map(|ip| {
            let parsed = ip.trim().parse::<Ipv4Addr>().ok()?;
            if !parsed.is_private() {
                return None;
            }

            let normalized = parsed.to_string();
            if dedup.insert(normalized.clone(), ()).is_none() {
                return Some(normalized);
            }

            None
        })
        .collect();

    if candidates.is_empty() {
        return Ok(Vec::new());
    }

    let mut found = HashMap::<String, DiscoveredMixer>::new();

    for chunk in candidates.chunks(10) {
        let mut handles = Vec::with_capacity(chunk.len());

        for ip in chunk {
            let probe_client = client.clone();
            let probe_ip = ip.clone();
            handles.push(tauri::async_runtime::spawn(async move {
                probe_mixer_ip(&probe_client, &probe_ip, 240).await
            }));
        }

        for handle in handles {
            if let Ok(Some(mixer)) = handle.await {
                found.entry(mixer.ip.clone()).or_insert(mixer);
            }
        }
        // Sem break: proba TODOS os IPs conhecidos mesmo após achar um.
    }

    Ok(found.into_values().collect())
}

#[cfg(test)]
mod tests {
        use super::{parse_finder_html, parse_ipv4_from_ping_output};

        #[test]
        fn parses_finder_table_rows() {
                let html = r#"
                <table>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>AXIOS16E</td>
                            <td>192.168.1.20</td>
                            <td><a href=\"http://192.168.1.20/\">➤</a></td>
                        </tr>
                    </tbody>
                </table>
                "#;

                let mixers = parse_finder_html(html);

                assert_eq!(mixers.len(), 1);
                assert_eq!(mixers[0].name, "AXIOS16E");
                assert_eq!(mixers[0].ip, "192.168.1.20");
                assert_eq!(mixers[0].channels, Some(16));
        }

        #[test]
        fn parses_ipv4_from_ping_output() {
                let output = "PING findmixer.local (192.168.1.20): 56 data bytes\n64 bytes from 192.168.1.20: icmp_seq=0 ttl=64 time=3.2 ms\n";

                assert_eq!(parse_ipv4_from_ping_output(output).as_deref(), Some("192.168.1.20"));
        }
}

#[tauri::command]
async fn discover_mixers(preferred_ips: Option<Vec<String>>, full_scan: Option<bool>) -> Result<Vec<DiscoveredMixer>, String> {
    let preferred = preferred_ips.unwrap_or_default();

    if full_scan.unwrap_or(false) {
        // Scan completo: varre toda a rede local (IPs conhecidos primeiro).
        // Usado no refresh manual — encontra mesas desconhecidas além das já vistas.
        return discover_mixers_by_local_probe(Some(preferred)).await;
    }

    // Scan rápido (padrão): proba apenas IPs conhecidos/preferidos.
    // Usado no polling periódico — retorna rápido e mantém lista atualizada.
    let preferred_results = discover_mixers_by_preferred_ips(&preferred).await?;
    if !preferred_results.is_empty() {
        return Ok(preferred_results);
    }

    // Nenhum IP conhecido respondeu: tenta o scan local completo como fallback.
    discover_mixers_by_local_probe(Some(preferred)).await
}

#[tauri::command]
async fn validate_license(payload: LicenseValidatePayload) -> Result<LicenseValidateResponse, String> {
    let client = license_http_client()?;

    let response = client
        .post("https://axcontrol.com.br/api/license/validate.php")
        .json(&serde_json::json!({
            "license_key": payload.license_key,
            "series": payload.series,
            "device_id": payload.device_id,
            "device_name": payload.device_name,
            "platform": payload.platform,
            "app_version": payload.app_version,
        }))
        .send()
        .await
        .map_err(|error| format!("request error: {error}"))?;

    let status_code = response.status().as_u16();
    let raw_body = response
        .text()
        .await
        .map_err(|error| format!("read body error: {error}"))?;

    let body = serde_json::from_str::<serde_json::Value>(&raw_body)
        .unwrap_or_else(|_| serde_json::json!({
            "status": "error",
            "message": raw_body,
        }));

    Ok(LicenseValidateResponse { status_code, body })
}

#[tauri::command]
async fn license_api_request(payload: LicenseApiRequestPayload) -> Result<LicenseApiResponse, String> {
    let client = license_http_client()?;
    let method = payload.method.trim().to_uppercase();
    let url = payload.url.trim();

    if url.is_empty() {
        return Err("request error: empty url".to_string());
    }

    let request = match method.as_str() {
        "GET" => client.get(url),
        "POST" => client.post(url),
        other => return Err(format!("request error: unsupported method {other}")),
    };

    let request = request.header("Content-Type", "application/json");
    let request = if method == "POST" {
        if let Some(body) = payload.body {
            request.json(&body)
        } else {
            request
        }
    } else {
        request
    };

    let response = request
        .send()
        .await
        .map_err(|error| format!("request error: {error}"))?;

    let status_code = response.status().as_u16();
    let raw_body = response
        .text()
        .await
        .map_err(|error| format!("read body error: {error}"))?;

    let body = serde_json::from_str::<serde_json::Value>(&raw_body)
        .unwrap_or_else(|_| serde_json::json!({
            "status": "error",
            "message": raw_body,
        }));

    Ok(LicenseApiResponse {
        status_code,
        body,
        raw_body,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_websocket::init())
        .invoke_handler(tauri::generate_handler![discover_mixers, validate_license, license_api_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
