
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar active state + smooth scroll
  document.querySelectorAll(".menu a").forEach(a => {
    a.addEventListener("click", (e) => {
      if(a.hash){
        e.preventDefault();
        document.querySelectorAll(".menu a").forEach(x=>x.classList.remove("active"));
        a.classList.add("active");
        document.querySelector(a.hash).scrollIntoView({behavior:"smooth", block:"start"});
      }
    });
  });

  // Simple quiz scoring
  const btn = document.getElementById("btn-eval");
  const out = document.getElementById("quiz-result");
  if(btn){
    btn.addEventListener("click", () => {
      let score = 0;
      const q1 = document.querySelector("input[name='q1']:checked");
      if(q1 && q1.value === "b") score += 40; // ejecución lineal
      const q2 = document.querySelector("input[name='q2']:checked");
      if(q2 && q2.value === "a") score += 40; // leer->calcular->mostrar = secuencial
      const open = document.getElementById("q3");
      if(open && open.value.trim().length >= 25) score += 20; // pseudocódigo mínimo

      out.innerHTML = `<div class="note"><strong>Puntaje:</strong> ${score} / 100</div>`;
      scormSetScore(score);
      scormComplete(score >= 70);
      window.scrollTo({top:0, behavior:"smooth"});
    });
  }
});
