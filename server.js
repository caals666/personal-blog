require("dotenv").config();

const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const path = require("path")
const fs = require('fs');
const cookieParser = require('cookie-parser');

app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

const filePath = path.join(__dirname, "data.json");

if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf-8').trim().length === 0) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
}

app.get("/", (req, res) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    let username = null;
    const token = req.cookies.token;
    if (token) {
        try {
            const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            username = user.name;
        } catch (e) {}
    }
    res.render('home', { posts: data, username });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    if (data.some(user => user.username === username)) {
        return res.status(400).send('Username already exists');
    }
    data.push({ username, password });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    const user = data[0]["users"].find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).send('Invalid credentials');
    const token = jwt.sign({ name: username }, process.env.ACCESS_TOKEN_SECRET);
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/admin');
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

app.get('/posts', authenticateToken, (req, res) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    res.json(data.filter(post => post.username == req.user.name));
});

app.get('/admin', authenticateToken, (req, res) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    const userPosts = data
        .map((post, idx) => ({ ...post, id: idx }))
        .filter(post => post.username === req.user.name);
    res.render('admin', { posts: userPosts, username: req.user.name });
});

app.get('/post', authenticateToken, (req, res) => {
    res.render('post');
});

app.post('/post', authenticateToken, (req, res) => {
    const username = req.user.name;
    const content = req.body.content;
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    data.push({ username, title: content });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.redirect('/');
});
app.post('/edit/:id', authenticateToken, (req, res) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    const id = parseInt(req.params.id);
    if (!data[id] || data[id].username !== req.user.name) return res.status(403).send('Forbidden');
    data[id].title = req.body.content;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.redirect('/admin');
});
app.post('/delete/:id', authenticateToken, (req, res) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    const id = parseInt(req.params.id);
    if (!data[id] || data[id].username !== req.user.name) return res.status(403).send('Forbidden');
    data.splice(id, 1);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.redirect('/admin');
});

app.get('/articles/:id', (req, res) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    const id = parseInt(req.params.id);
    const post = data[id];
    if (!post) return res.status(404).send('Article not found');
    res.render('article', { post, id });
});

app.get('/edit/:id', authenticateToken, (req, res) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    const id = parseInt(req.params.id);
    const post = data[id];
    if (!post || post.username !== req.user.name) return res.status(403).send('Forbidden');
    res.render('edit', { post, id });
});

function authenticateToken(req, res, next) {
    const token = req.cookies.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
    if (!token) return res.redirect('/login');
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.redirect('/login');
        req.user = user;
        next();
    });
}

app.listen(3000);