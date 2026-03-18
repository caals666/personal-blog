require("dotenv").config();

const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const path = require("path")
const fs = require('fs');
const { json } = require("stream/consumers");

app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}));

const filePath = path.join(__dirname, "data.json");

if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf-8').trim().length === 0) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
}

app.get("/", (req, res) => {
    let data = JSON.parse(fs.readFileSync(filePath))||[];
    res.render('home', { posts: data });
})

app.get('/posts', authenticateToken, (req, res) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    res.json(data.filter(post => post.username == req.user.name));
})

app.post('/post',(req,res)=>{
    const username=req.body.username;
    const password=req.body.password;
    const content=req.body.content;
    const payload={username:username,title:content};
    process.env.TEMP=jwt.sign(payload,process.env.ACCESS_TOKEN_SECRET);
    console.log(`usernmae: ${username}, password: ${password}, content: ${content}`)
    let data = JSON.parse(fs.readFileSync(filePath))||[];
    data.push({username:username,title:content});
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.redirect("/")
})

app.get("/post",(req,res)=>{
    let data = JSON.parse(fs.readFileSync(filePath))||[];
    res.render("post",{posts:data});
})

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

app.listen(3000);