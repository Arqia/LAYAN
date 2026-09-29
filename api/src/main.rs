mod auth;
mod error;
mod seed;

use std::str::FromStr;

use axum::routing::{get, post};
use axum::{Json, Router};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use utoipa::OpenApi;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub cookie_secure: bool,
}

#[derive(OpenApi)]
#[openapi(
    info(title = "LAYAN API", version = "0.1.0"),
    paths(health, auth::login, auth::logout, auth::me),
    components(schemas(auth::Role, auth::User, auth::LoginReq, auth::LoginRes))
)]
struct ApiDoc;

#[utoipa::path(get, path = "/api/health", responses((status = 200, body = String)))]
async fn health() -> &'static str {
    "ok"
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_owned())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // `cargo run -- --openapi > ../openapi.json` untuk generate client web dan Android.
    if std::env::args().any(|a| a == "--openapi") {
        println!("{}", ApiDoc::openapi().to_pretty_json()?);
        return Ok(());
    }

    dotenvy::dotenv().ok();
    let opts = SqliteConnectOptions::from_str(&env_or("DATABASE_URL", "sqlite://layan.db"))?
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal);
    let db = SqlitePoolOptions::new().connect_with(opts).await?;
    sqlx::migrate!().run(&db).await?;
    seed::run(&db).await?;

    let state = AppState { db, cookie_secure: env_or("COOKIE_SECURE", "0") == "1" };
    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/openapi.json", get(|| async { Json(ApiDoc::openapi()) }))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/logout", post(auth::logout))
        .route("/api/me", get(auth::me))
        .with_state(state);

    let addr = env_or("BIND", "127.0.0.1:8080");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    println!("LAYAN API jalan di http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}
