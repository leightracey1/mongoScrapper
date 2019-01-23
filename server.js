var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder *Might have to get rid of this when adding handlebars*
app.use(express.static("public"));

var exphbs = require("express-handlebars");

// app.set("view engine", "handlebars");
// app.set('views', path.join(__dirname, 'app', 'views'));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Connect to the Mongo DB

var databaseUri = "mongodb://localhost/BRscraper1"

if (process.env.MONGODB_URI) {
mongoose.connect(process.env.MONGODB_URI)
} else {
mongoose.connect(databaseUri)
}


// **Routes**
// A GET route for scraping BleacherReport.com
app.get("/scrape", function(req, res) {

    axios.get("https://www.newyorker.com").then(function(response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);
    
        // Now, we grab every h2 within an article tag, and do the following:
        $("a.Link__link___3dWao").each(function(i, element) {
          // Save an empty result object
          var result = {};
    
          // Add the text and href of every link, and save them as properties of the result object
          
          result.title = $(this).children().text();
          console.log(result.title);
          result.link = $(this).attr("href");
          console.log(result.link);
    
          // Create a new Article using the `result` object built from scraping
          db.Article.create(result)
            .then(function(dbArticle) {
              // View the added result in the console
              console.log(dbArticle);
            })
            .catch(function(err) {
              // If an error occurred, log it
              console.log(err);
            });
        });
    
        // Send a message to the client
        res.send("Scrape Complete");
      });

});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/monkeys/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/", function(req, res) {
  db.Article.find({"saved": false}, function(error, data) {
    var hbsObject = {
      article: data
    };
    console.log(hbsObject);
    res.render("home", hbsObject);
  });
});

app.get("/saved", function(req, res) {
  db.Article.find({"saved": true}).populate("notes").exec(function(error, articles) {
    var hbsObject = {
      article: articles
    };
    res.render("saved", hbsObject);
  });
});

app.post("/articles/save/:id", function(req, res) {
  // Use the article id to find and update its saved boolean
  db.Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true})
  // Execute the above query
  .then(function(err, doc) {
    // Log any errors
    if (err) {
      console.log(err);
    }
    else {
      // Or send the document to the browser
      res.send(doc);
    }
  });
});

app.post("/articles/delete/:id", function(req, res) {
  // Use the article id to find and update its saved boolean
  db.Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false})
  // Execute the above query
  .then(function(err, doc) {
    // Log any errors
    if (err) {
      console.log(err);
    }
    else {
      // Or send the document to the browser
      res.send(doc);
    }
  });
});


// Start the server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
  });