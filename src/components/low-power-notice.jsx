// Shown while low power mode has the canvas halo off (see App.jsx), so the
// change is never silent and there is always a way back. Fixed position, so
// it never shifts the layout, and no backdrop blur, which would cost the
// same compositing it is there to save.
export const LowPowerNotice = ({ onRestore, onDismiss }) => (
  <div className="low-power-notice" role="status">
    <p className="low-power-notice-text">Effects reduced so the globe runs faster on this device.</p>
    <div className="low-power-notice-actions">
      <button type="button" className="button button-ghost low-power-notice-button" onClick={onRestore}>
        Turn effects back on
      </button>
      <button type="button" className="button low-power-notice-button low-power-notice-button--primary" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  </div>
);
