const book = document.getElementById('book');
const pageInput = document.getElementById('pageInput');
let currentPage = 1;
const totalPages = document.querySelectorAll('.page').length || 0;

async function loadPages() {
  const res = await fetch('pages.json');
  const data = await res.json();
  window.pages = data.pages;
  showPages(currentPage);
}

function showPages(n) {
  book.innerHTML = '';
  const left = n;
  const right = n + 1;
  const createPage = (num) => {
    if (num <= window.pages.length) {
      const img = document.createElement('img');
      img.src = 'pages/' + window.pages[num - 1];
      const div = document.createElement('div');
      div.className = 'page';
      div.appendChild(img);
      return div;
    }
    return document.createElement('div');
  };
  if (window.innerWidth >= 768) {
    book.appendChild(createPage(left));
    book.appendChild(createPage(right));
  } else {
    book.appendChild(createPage(left));
  }
  pageInput.value = n;
}

document.getElementById('first').onclick = () => { currentPage = 1; showPages(currentPage); };
document.getElementById('prev').onclick = () => { if (currentPage > 1) currentPage -= 2; showPages(currentPage); };
document.getElementById('next').onclick = () => { if (currentPage < window.pages.length) currentPage += 2; showPages(currentPage); };
document.getElementById('last').onclick = () => {
  currentPage = window.pages.length % 2 === 0 ? window.pages.length - 1 : window.pages.length;
  showPages(currentPage);
};
pageInput.onchange = () => {
  let n = parseInt(pageInput.value);
  if (n < 1) n = 1;
  if (n > window.pages.length) n = window.pages.length;
  currentPage = n % 2 === 0 ? n - 1 : n;
  showPages(currentPage);
};

loadPages();
