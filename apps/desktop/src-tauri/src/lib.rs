use regex::Regex;
use serde::Serialize;
use std::process::Command;
use std::time::Duration;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiscoveredMixer {
    id: String,
    name: String,
    ip: String,
    model: Option<String>,
    channels: Option<u16>,
    status: String,
    source: String,
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

fn infer_model_and_channels(name: &str) -> (Option<String>, Option<u16>) {
    let normalized = name.to_ascii_uppercase();
    let axios_regex = Regex::new(r"AXIOS\s*(\d+)([A-Z0-9_-]*)").expect("valid axios model regex");

    if let Some(captures) = axios_regex.captures(&normalized) {
        let channels = captures
            .get(1)
            .and_then(|value| value.as_str().parse::<u16>().ok());

        return (Some(normalized), channels);
    }

    if normalized.contains("AXIOS32") {
        return (Some("Axios 32".to_string()), Some(32));
    }

    if normalized.contains("AXIOS16E") {
        return (Some("AXIOS16E".to_string()), Some(16));
    }

    if normalized.contains("AXIOS16") {
        return (Some("Axios 16".to_string()), Some(16));
    }

    (None, None)
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
                model,
                channels,
                status: "online".to_string(),
                source: "finder".to_string(),
            })
        })
        .collect()
}

fn parse_ipv4_from_ping_output(output: &str) -> Option<String> {
    let ipv4_regex = Regex::new(r"(?m)\((?P<ip>(?:\d{1,3}\.){3}\d{1,3})\)").expect("valid ping ip regex");

    ipv4_regex
        .captures(output)
        .and_then(|captures| captures.name("ip"))
        .map(|value| value.as_str().to_string())
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

#[cfg(not(target_os = "macos"))]
fn resolve_finder_ip() -> Option<String> {
    None
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
async fn discover_mixers() -> Result<Vec<DiscoveredMixer>, String> {
    let Some(html) = fetch_finder_html().await? else {
        return Ok(Vec::new());
    };

    Ok(parse_finder_html(&html))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![discover_mixers])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
