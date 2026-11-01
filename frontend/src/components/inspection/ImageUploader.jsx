import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '../../utils/constants';
import { formatFileSize } from '../../utils/formatters';
import './ImageUploader.css';

const ImageUploader = ({ onImageSelect, selectedImage, onRemoveImage }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    setError(null);

    if (!file) {
      return false;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload JPG, JPEG, or PNG images.');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds ${formatFileSize(MAX_FILE_SIZE)}. Please upload a smaller image.`);
      return false;
    }

    return true;
  };

  const handleFile = (file) => {
    if (validateFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageSelect({
          file,
          preview: e.target.result,
          name: file.name,
          size: file.size,
          type: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setError(null);
    onRemoveImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-uploader">
      {!selectedImage ? (
        <div
          className={`upload-zone ${dragActive ? 'drag-active' : ''} ${error ? 'error' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            accept=".jpg,.jpeg,.png"
            onChange={handleChange}
          />
          
          <div className="upload-content">
            <div className="upload-icon">
              <Upload size={40} strokeWidth={1.5} />
            </div>
            <h3 className="upload-title">Drop image here or click to upload</h3>
            <p className="upload-subtitle">
              Support: JPG, JPEG, PNG • Max size: {formatFileSize(MAX_FILE_SIZE)}
            </p>
            <button 
              type="button"
              className="upload-button"
              onClick={handleButtonClick}
            >
              <Upload size={18} />
              Select Image
            </button>
          </div>

          {error && (
            <div className="upload-error">
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="image-preview">
          <button 
            type="button"
            className="remove-image-btn"
            onClick={handleRemove}
            title="Remove image"
          >
            <X size={20} />
          </button>
          <img 
            src={selectedImage.preview} 
            alt="Selected for inspection" 
            className="preview-image"
          />
          <div className="image-info">
            <div className="info-item">
              <ImageIcon size={16} />
              <span className="text-mono body-sm">{selectedImage.name}</span>
            </div>
            <span className="text-muted body-sm">
              {formatFileSize(selectedImage.size)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
