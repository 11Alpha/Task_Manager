//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require('lodash');
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public/"));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.error("Error connecting to MongoDB:", err);
});

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist"
});

const item2 = new Item({
  name: "Example Item"
});

const item3 = new Item({
  name: "<-- hit it to delete the item!"
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name:String,
  items:[itemsSchema]
};

const List = mongoose.model("List",listSchema);




app.get("/", async function(req, res) {
  try {
    // Use async/await to find all items from the database and render them
    const foundItems = await Item.find({});
    if(foundItems.length === 0){
      
    Item.insertMany(defaultItems)
    .then(() => {
      console.log("Successfully saved default items to DB.");
    })
    .catch(err => {
      console.log(err);
    });
      res.redirect("/");
    }

    else{
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }
  } 
  catch (err) {
    console.error("Error fetching items:", err);
  }
});

app.get("/:customListName", async function(req, res) {
  const customListName = _.capitalize(req.params.customListName);

  try {
    // Use async/await to find a list with the specified name
    const foundList = await List.findOne({ name: customListName });

    if (!foundList) {
      // Create a new list if it doesn't exist
      const list = new List({
        name: customListName,
        items: defaultItems // Make sure it's "items" (plural)
      });

      await list.save();

      // Redirect to the newly created list
      res.redirect("/" + customListName);
    } else {
      // Show an existing list
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
    }
  } catch (err) {
    console.error("Error finding or creating list:", err);
  }
});


app.post("/", async function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  try {
    if (listName === "Today") {
      await item.save();
      res.redirect("/");
    } else {
      const foundList = await List.findOne({ name: listName });
      if (foundList) {
        foundList.items.push(item);
        await foundList.save();
        res.redirect("/" + listName);
      }
    }
  } catch (err) {
    console.error("Error saving item or finding list:", err);
  }
});


app.post("/delete", async function(req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    try {
      // Use async/await to find and remove the item by ID
      await Item.findByIdAndRemove(checkedItemId);
      console.log("Successfully deleted the checked item!");
      res.redirect("/");
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  } else {
    try {
      const foundList = await List.findOne({ name: listName });
      if (foundList) {
        // Use async/await to update the list and remove the item
        await foundList.updateOne({ $pull: { items: { _id: checkedItemId } } });
        res.redirect("/" + listName);
      }
    } catch (err) {
      console.error("Error updating list or deleting item:", err);
    }
  }
});


app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
