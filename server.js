const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/library_db';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

const Book = mongoose.model('Book', bookSchema);

app.get('/api', (req, res) => {
  res.json({
    message: 'Library Book Management API is running',
    endpoints: {
      createBook: 'POST /api/books',
      getBooks: 'GET /api/books?page=1&limit=10',
      updateAvailability: 'PATCH /api/books/:id',
    },
  });
});

app.post('/api/books', async (req, res) => {
  try {
    const { title, author, category } = req.body;

    if (!title || !author || !category) {
      return res.status(400).json({
        message: 'title, author, and category are required',
      });
    }

    const newBook = new Book({
      title,
      author,
      category,
      availability: true,
    });

    const savedBook = await newBook.save();

    return res.status(201).json({
      message: 'Book added successfully',
      book: savedBook,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error while creating book',
      error: error.message,
    });
  }
});

app.get('/api/books', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const totalBooks = await Book.countDocuments();
    const books = await Book.find().sort({ createdAt: -1 }).skip(skip).limit(limit);

    return res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(totalBooks / limit),
      totalBooks,
      books,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error while fetching books',
      error: error.message,
    });
  }
});

app.patch('/api/books/:id', async (req, res) => {
  try {
    const { availability } = req.body;

    if (typeof availability !== 'boolean') {
      return res.status(400).json({
        message: 'availability must be a boolean value',
      });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true, runValidators: true }
    );

    if (!updatedBook) {
      return res.status(404).json({
        message: 'Book not found',
      });
    }

    return res.status(200).json({
      message: 'Book availability updated successfully',
      book: updatedBook,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error while updating book availability',
      error: error.message,
    });
  }
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  });

module.exports = app;
