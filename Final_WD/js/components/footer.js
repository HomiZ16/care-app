(function () {
  const root = document.getElementById('care-footer-root');
  if (!root) return;
  root.innerHTML = `
    <footer class="settings-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="footer-logo">C</div>
          <div>
            <strong>CARE</strong>
            <span>Collaborative Asset & Reliability Efficiency</span>
          </div>
        </div>
        <div class="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">About</a>
        </div>
        <div class="footer-copy">
          © <span id="footerYear"></span> CARE · Made for reliable businesses
        </div>
      </div>
    </footer>
  `;
  document.getElementById('footerYear').textContent = new Date().getFullYear();
})();