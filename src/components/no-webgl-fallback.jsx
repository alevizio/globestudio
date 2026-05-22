// Static fallback rendered in place of the WebGL canvas when the
// current browser/GPU can't create a WebGL context. The pre-flight
// `hasWebGL()` check in App.jsx decides which path to render — this
// component never mounts when WebGL is available, so Three.js never
// loads either, saving the user the 142KB-gzipped bundle they can't
// use.
//
// Visual: shows the designed share card (1200×630 PNG, hand-laid in
// satori) as a representative image of what Globestudio normally
// renders, plus a friendly explanation + remediation tips. Designed
// to look intentional, not broken.

export const NoWebGLFallback = () => (
  <div className="no-webgl" role="alert">
    <div className="no-webgl-inner">
      <img
        className="no-webgl-image"
        src="/og/default.png"
        alt="Globestudio — dotted globe preview"
        width="600"
        height="315"
        loading="eager"
      />
      <h2 className="no-webgl-title">WebGL is needed for the live globe</h2>
      <p className="no-webgl-body">
        Your browser couldn’t create a WebGL context, so the interactive globe
        can’t render. Everything else on Globestudio still works — you just see
        a still preview instead of the animated 3D version.
      </p>
      <details className="no-webgl-details">
        <summary>How to enable WebGL</summary>
        <ul>
          <li>
            <strong>Chrome / Edge:</strong> Settings → System → enable “Use
            hardware acceleration when available,” then restart the browser.
          </li>
          <li>
            <strong>Safari:</strong> Develop menu → Experimental Features →
            ensure WebGL is on (it’s on by default in modern versions).
          </li>
          <li>
            <strong>Firefox:</strong> Open <code>about:config</code> and
            check <code>webgl.disabled</code> is set to <code>false</code>.
          </li>
          <li>
            On low-spec or sandboxed environments (some corp laptops,
            virtualized desktops, some headless browsers) WebGL is disabled
            at the OS / GPU level and the browser can’t turn it on.
          </li>
        </ul>
      </details>
      <div className="no-webgl-actions">
        <a
          className="button"
          href="https://get.webgl.org/"
          target="_blank"
          rel="noreferrer noopener"
        >
          Run WebGL diagnostic
        </a>
        <a
          className="button button-ghost"
          href="https://github.com/alevizio/globestudio"
          target="_blank"
          rel="noreferrer noopener"
        >
          View source on GitHub
        </a>
      </div>
    </div>
  </div>
);
