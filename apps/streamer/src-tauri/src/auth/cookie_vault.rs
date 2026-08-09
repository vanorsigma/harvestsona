use std::{ops::Deref, sync::Arc};

use anyhow::Result;
use reqwest_cookie_store::{CookieStore, CookieStoreMutex};

pub type SharedCookieStore = Arc<CookieStoreMutex>;

#[derive(Clone)]
pub struct CookieVault {
    cookie_store: SharedCookieStore,
}

impl Default for CookieVault {
    fn default() -> Self {
        Self {
            cookie_store: Arc::new(CookieStoreMutex::new(CookieStore::new())),
        }
    }
}

impl Deref for CookieVault {
    type Target = SharedCookieStore;
    fn deref(&self) -> &Self::Target {
        &self.cookie_store
    }
}

impl CookieVault {
    pub fn from_filename(filename: &str) -> Result<Self> {
        let file = std::fs::File::open(filename).map(std::io::BufReader::new)?;
        cookie_store::serde::json::load(file)
            .map(|v| Self {
                cookie_store: Arc::new(CookieStoreMutex::new(v)),
            })
            .map_err(|e| anyhow::anyhow!(e))
    }

    pub fn try_from_filename(filename: &str) -> Self {
        Self::from_filename(filename).unwrap_or_default()
    }

    pub fn save_into(&self, filename: &str) -> Result<()> {
        let mut writer = std::fs::File::create(filename).map(std::io::BufWriter::new)?;
        let store = self.cookie_store.lock().unwrap();
        cookie_store::serde::json::save(&store, &mut writer).map_err(|e| anyhow::anyhow!(e))
    }

    pub fn clear_cookies(&self) -> Result<()> {
        let mut store = self
            .cookie_store
            .lock()
            .map_err(|_| anyhow::anyhow!("Can't get the cookie store lock"))?;
        store.clear();
        Ok(())
    }
}
