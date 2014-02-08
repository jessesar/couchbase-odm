couchbase-odm
=============

A simple Object Data Mapper for Couchbase.

Usage
-----

### Creating a model
```javascript
var User = odm.createModel('User', { name: 'String',
						  username: { type: 'String', index: true } }, couchbase_connection);
```

### Adding an object
```javascript
var u = new User({ name: 'Jesse' });
u.username = 'jessevandersar';

console.log(u._id); # --> automatically generated UUIDv4-id
console.log(u._type); # --> 'User'

u.save();
```

### Retrieving and updating an object
```javascript
User.getById(id, function(u) {
	u.username = 'new_username';
	
	u.save();
});
```

Indexes/Views
-------------

Adding the 'index'-option to a field, as with the 'username'-field in the example, automatically creates a very basic view for querying this object-type with the field as a key.

### Querying an object type (view)
```javascript
User.getByUsername('jessevandersar', function(results) {
  console.log(results);
});
```

An 'all'-view will be added by default, usable with `User.getAll(...)`.
Also, views that already exist in the design document will be automatically imported from Couchbase.

_Note: imported views with names like 'specific\_view' will be usable with `User.specificView(key, callback)`._