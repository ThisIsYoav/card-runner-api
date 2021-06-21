const users = require("./routes/users");
const auth = require("./routes/auth");
const cards = require("./routes/cards");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const mongoose = require("mongoose");
//remove cors when uploading project to server
const cors = require("cors");

// connect to mongoDB
mongoose
  .connect("mongodb://localhost/card_runner_api", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
  })
  .then(() => console.log("Connected to MongoDB..."))
  .catch(err => console.error("Could not connect to MongoDB..."));

//remove cors when uploading project to server
app.use(cors());
app.use(express.json());

app.use("/api/users", users);
app.use("/api/auth", auth);
app.use("/api/cards", cards);

const port = 3002;
http.listen(port, () => console.log(`Listening on port ${port}...`));
