-- Hasil klasifikasi gambar lampiran oleh LLM: dokumen | foto | lainnya. NULL = tidak dicek (PDF, mock, atau LLM gagal).
ALTER TABLE attachments ADD COLUMN label TEXT;
