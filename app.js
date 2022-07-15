const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.use(express.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.set('view engine', 'ejs');                                  // "ejs" is set as the app's view engine.

const USER_NAME = "";                                             // mongoAtlas user name
const USER_PASS = "";                                             // mongoAtlas user password

mongoose.connect("mongodb+srv://" + USER_NAME + ":" + USER_PASS + "@cluster0.soor9qp.mongodb.net/todolistDB",  {useNewUrlParser: true})        //connect to DB, 27017= mongodb port, todolistDB= db name.

const itemsSchema = {                                           //new mongoose Schema for items
  name: String
};

const Item = mongoose.model(                       //mongoose model for items collection(Item)
  "item",                                         //first argument, singular version of the collection name (which will be "items")
  itemsSchema                                     //second argument, Schema used to create the items collection
);

const item1 = new Item({                          //creating a new document from Item model
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]              //think about relations in sql databases.
}

const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems) {                          //finds all items in the database
    if (foundItems.length === 0) {                                    //if items' collection is empty... following line executes
      Item.insertMany(defaultItems, function(err) {                 //inserts all default texts into the items collection
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully saved default items to DB.");
        }
      });
      res.redirect("/");
    } else {
      const url = req.url;                          //takes url entered by client,sent to html page to set post route.
      res.render("list", {                          //.render uses the ejs view engine to render a particular page( a view directory must exist).
        listTitle: "Today",
        newListItems: foundItems,
        currentList: url
      });

    }
  });

});

app.post("/", function(req, res) {

  const listName = _.capitalize(_.kebabCase(req.body.list));            //removes "/" from url, kebabcase if separate words found and capitalize first letter
  const itemName = req.body.newItem;                                  //get user input(item).

  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {                     // if list is the home route,
    item.save();                                  //save the input(item).
    res.redirect("/");
  } else {                                        // if list is a custom list
    List.findOne({name: listName}, function(err, foundList){    //finds corresponding list in lists collection and saves item in the list's items collection
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

app.post("/delete", function(req, res) {

  const url = req.body.currentList;
  const listName = _.capitalize(_.kebabCase(url));
  const checkedItemId = req.body.checkedItem;               //takes checkedItem from checkbox

  if (url === "/") {
    Item.findByIdAndRemove(checkedItemId, function(err) {     //remove item using it's id, removes ONLY when callback is provided else finds the item
      if (err) {
        console.log(err);
      } else {
        console.log("Item deleted");
      }
    });
    res.redirect("/")
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){     //finds the matching element, $pull option removes item that matches the condition
      if (!err) {
        res.redirect("" + url);
      }
    });
  }

});

app.get("/:customListName", function(req, res) {
  const url = req.url;
  const customList = _.capitalize(_.kebabCase(req.params.customListName));
  List.findOne({name: customList}, function(err, foundList){                  //look for requested list in database
    if (!err) {
      if (!foundList) {                                                       //if list does not exit, create one
        const list = new List ({
          name: customList,
          items: defaultItems
        });
        list.save(function(){
          if (!err) {
            res.redirect("/" + customList);
          }
        });

      } else {                                                        //if list exists, render data
        res.render("list", {
          listTitle: customList,
          newListItems: foundList.items,
          currentList: url
        });
      }
    }
  });

});

app.get("/about", function(req, res) {
  res.render("about");
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started.");
});
