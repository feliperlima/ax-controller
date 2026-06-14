fn main() {
    tauri_build::build();

    // Priority: AX_API_KEY env var → VITE_AX_APP_KEY env var → .env file
    let key = std::env::var("AX_API_KEY")
        .or_else(|_| std::env::var("VITE_AX_APP_KEY"))
        .or_else(|_| read_dotenv_var("AX_API_KEY"))
        .or_else(|_| read_dotenv_var("VITE_AX_APP_KEY"))
        .unwrap_or_default();

    if !key.is_empty() {
        println!("cargo:rustc-env=AX_API_KEY={}", key);
    }
    println!("cargo:rerun-if-env-changed=AX_API_KEY");
    println!("cargo:rerun-if-env-changed=VITE_AX_APP_KEY");
    println!("cargo:rerun-if-changed=../.env");
}

fn read_dotenv_var(var_name: &str) -> Result<String, ()> {
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let env_path = manifest_dir.parent().unwrap_or(manifest_dir).join(".env");
    let content = std::fs::read_to_string(env_path).map_err(|_| ())?;
    let prefix = format!("{}=", var_name);
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        if let Some(value) = line.strip_prefix(&prefix) {
            let value = value.trim().trim_matches('"').trim_matches('\'').to_string();
            if !value.is_empty() {
                return Ok(value);
            }
        }
    }
    Err(())
}
