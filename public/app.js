const pageSize = 10;
let currentPage = 1;
let totalPages = 1;

const bookForm = document.querySelector('#book-form');
const formMessage = document.querySelector('#form-message');
const listMessage = document.querySelector('#list-message');
const bookList = document.querySelector('#book-list');
const bookCount = document.querySelector('#book-count');
const pagination = document.querySelector('#pagination');
const previousPage = document.querySelector('#previous-page');
const nextPage = document.querySelector('#next-page');
const pageLabel = document.querySelector('#page-label');

async function request(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'The request could not be completed.');
  }

  return data;
}

function showFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle('error', isError);
}

function makeBookRow(book) {
  const row = document.createElement('article');
  row.className = 'book-row';

  const cover = document.createElement('span');
  cover.className = 'book-cover';
  cover.setAttribute('aria-hidden', 'true');
  cover.textContent = book.title.trim().charAt(0).toUpperCase();

  const details = document.createElement('div');
  details.className = 'book-details';

  const title = document.createElement('h3');
  title.className = 'book-title';
  title.textContent = book.title;

  const meta = document.createElement('p');
  meta.className = 'book-meta';
  meta.textContent = `${book.author} · ${book.category}`;

  const availability = document.createElement('button');
  availability.type = 'button';
  availability.className = `availability-button${book.availability ? '' : ' unavailable'}`;
  availability.textContent = book.availability ? 'Available' : 'Checked out';
  availability.setAttribute(
    'aria-label',
    `Mark ${book.title} as ${book.availability ? 'checked out' : 'available'}`
  );
  availability.addEventListener('click', async () => {
    availability.disabled = true;
    try {
      await request(`/api/books/${encodeURIComponent(book._id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: !book.availability }),
      });
      await loadBooks();
    } catch (error) {
      listMessage.textContent = error.message;
      listMessage.classList.add('error');
      availability.disabled = false;
    }
  });

  details.append(title, meta);
  row.append(cover, details, availability);
  return row;
}

async function loadBooks() {
  listMessage.textContent = 'Loading your books…';
  listMessage.classList.remove('error');
  bookList.replaceChildren();

  try {
    const data = await request(`/api/books?page=${currentPage}&limit=${pageSize}`);
    totalPages = Math.max(1, data.totalPages);
    bookCount.textContent = `${data.totalBooks} ${data.totalBooks === 1 ? 'book' : 'books'}`;

    if (data.books.length === 0) {
      listMessage.textContent = 'Your shelf is empty. Add your first book to get started.';
    } else {
      listMessage.textContent = '';
      bookList.append(...data.books.map(makeBookRow));
    }

    pagination.hidden = totalPages <= 1;
    pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;
    previousPage.disabled = currentPage <= 1;
    nextPage.disabled = currentPage >= totalPages;
  } catch (error) {
    bookCount.textContent = '— books';
    listMessage.textContent = `${error.message} Check that the server and database are running, then try again.`;
    listMessage.classList.add('error');
    pagination.hidden = true;
  }
}

bookForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = bookForm.querySelector('button[type="submit"]');
  const book = Object.fromEntries(new FormData(bookForm).entries());

  submitButton.disabled = true;
  showFormMessage('');

  try {
    await request('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    bookForm.reset();
    currentPage = 1;
    showFormMessage('Book added to your collection.');
    await loadBooks();
  } catch (error) {
    showFormMessage(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

previousPage.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadBooks();
  }
});

nextPage.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    loadBooks();
  }
});

loadBooks();
