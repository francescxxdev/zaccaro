import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ImageCropper from '../components/ImageCropper';

export default function Profile() {
  const { user, updateProfile, logout, imageUrl } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [cropSrc, setCropSrc] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!croppedBlob) {
      setPreview(user?.avatar ? imageUrl(user.avatar) : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.avatar]);

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const onCropDone = (blob) => {
    setCroppedBlob(blob);
    setPreview(URL.createObjectURL(blob));
    setCropSrc(null);
    setRemoveImage(false);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { username };
      const avatar = removeImage ? null : croppedBlob;
      const updated = await updateProfile(payload, avatar);
      setMessage({ text: 'Profilo aggiornato', type: 'success' });
      setPreview(updated.avatar ? imageUrl(updated.avatar) : null);
      setCroppedBlob(null);
    } catch (err) {
      setMessage({ text: err.message || 'Errore', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 2500);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <h1>
            <span className="title-icon">👤</span>
            Profilo
          </h1>
          <p className="page-subtitle">Aggiorna nome e immagine</p>
        </div>
        <div className="form-actions" style={{ marginBottom: 16 }}>
          <button className="btn btn-secondary" onClick={logout}>Esci</button>
        </div>
        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
        {cropSrc && <ImageCropper imageSrc={cropSrc} onCropDone={onCropDone} onCancel={() => setCropSrc(null)} />}
        <form onSubmit={onSave} className="admin-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Nome utente</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} />
            </div>
          </div>
          <div className="form-group form-group-full">
            <label>Immagine profilo</label>
            <div className="image-upload-area">
              {preview && !removeImage ? (
                <div className="image-preview-box">
                  <img src={preview && (preview.startsWith('blob:') || preview.startsWith('http') ? preview : imageUrl(preview))} alt="Avatar" className="image-preview-round" />
                  <div className="image-preview-actions">
                    <label className="btn btn-sm btn-edit image-change-btn">Cambia<input type="file" accept="image/*" onChange={handleFileSelect} hidden /></label>
                    <button type="button" className="btn btn-sm btn-delete" onClick={() => { setCroppedBlob(null); setPreview(null); setRemoveImage(true); }}>Rimuovi</button>
                  </div>
                </div>
              ) : (
                <label className="image-dropzone"><span>📷</span><p>Clicca per caricare</p><input type="file" accept="image/*" onChange={handleFileSelect} hidden /></label>
              )}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={saving}>Salva</button>
          </div>
        </form>
      </main>
    </div>
  );
}
