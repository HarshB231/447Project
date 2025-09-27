/* Simple search filter for demo tables */
function wireSearch() {
  const input = document.querySelector("#search");
  const rows = document.querySelectorAll("#upcoming tbody tr");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    rows.forEach(tr => {
      tr.style.display = tr.innerText.toLowerCase().includes(q) ? "" : "none";
    });
  });
}
document.addEventListener("DOMContentLoaded", wireSearch);
