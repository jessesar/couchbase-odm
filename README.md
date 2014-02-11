couchbase-odm
=============

A simple Object Data Mapper for Couchbase.

Installation
------------
Simply pull this repository or install with `npm install couchbase-odm`.

Usage
-----

### Creating a model
```javascript
var User = odm.createModel('User', { name: 'String',
						  username: { type: 'String', index: true } }, couchbase_connection);
```

_Chain `.setupViews()` onto the end of `createModel(...)` to automatically set up views based on indexes and import existing views from Couchbase._

### Adding static functions
```javascript
User.sayHello = function() { console.log('My name is '+ this.name); };
```

### Adding an object
```javascript
var u = new User({ name: 'Jesse' });
u.username = 'jessevandersar';

console.log(u._id); /* --> automatically generated UUIDv4-id */
console.log(u._type); /* --> 'User' */

u.sayHello(); /* --> 'My name is Jesse' */

u.save(function(result) {
  console.log(result); /* { object: <saved object>, result: <CAS> } */
});
```

### Retrieving and updating an object
```javascript
User.getById(id, function(u) {
  u.username = 'new_username';
	
  u.save();
});
```

### Deleting an object
```javascript
User.getById(id, function(u) {
  u.remove();
});
```

Indexes/Views
-------------

Adding the 'index'-option to a field, as with the 'username'-field in the example, automatically creates a very basic view for querying this object-type with the field as a key. Note that calling `.setupViews()` on the model is a prerequisite.

### Querying an object type (view)
```javascript
User.getByUsername('jessevandersar', function(results) {
  console.log(results);
});
```

_Secondary view options (like limit, descending and stale) can be added as an object in the second parameter._

An 'all'-view will be added by default, usable with `User.getAll(...)`.
Also, views that already exist in the design document will be automatically imported from Couchbase.

_Note: imported views with names containing underscores will be usable in camelcase with `User.specificView(key, callback)`._

Notes
-----

This module is in a very early state. It hasn't been tested in production yet, but has worked for me during development, and has served as a nice excercise in working with Couchbase and creating Node modules.
Please let me know about your thoughts and/or bugs that you've encountered!

**Github repo:** https://github.com/jessevandersar/couchbase-odm