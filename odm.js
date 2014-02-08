var uuid = require('node-uuid');

module.exports = {};

module.exports.createModel = function(name, fields, connection) {

  var model = function Model(values) {
    if(!values) values = {};
    
    for(key in fields) {
      if(values[key] == undefined) {
        values[key] = '';
      }
    }
    
    for (var key in values) { this[key] = values[key]; }
    
    for(var func in model.statics) {
      model.prototype[func] = model.statics[func];
    }

    this._id = uuid.v4();
    this._type = name;
  };
  
  model.statics = {};
  
  model.validateField = function(field) {
    if(field != 'String' && field != 'Number') throw "Invalid field type: "+ field;
    return true;
  }
  
  model.setViewFunc = function(viewName, funcName) {
    model[funcName] = function (value, cb) {      
      var view = connection.view(name, viewName);
      
      var q = {};
      if(viewName != 'all') {
        q = { key: value };
      } else {
        cb = value;
      }
      
      view.query(q, function(err, results) {
        if(err) throw err;
        
        cb(results.map(model.unserialize));
      })
    };
  };
  
  model.indexes = [];
  
  for(key in fields) {
    if(typeof(fields[key]) == 'object') {
      // Options given
      
      var field = fields[key];
      model.validateField(field.type);
      
      if(field.index) {
        model.indexes.push(key);
        
        model.setViewFunc('by'+ key, 'getBy'+ (key.charAt(0).toUpperCase() + key.slice(1)));
      }
    } else {
      // No options given, value = type
      
      model.validateField(fields[key]);
    }
  }
  
  // Get all
  model.setViewFunc('all', 'getAll');
  
  model.prototype.save = function(cb) {
    var obj = this;
    
    connection.set(this._type +'_'+ this._id, obj, function(err, result) {
      if(err) throw err;
      
      if(cb) {
        cb({ object: obj, result: result });
      }
    });
  };
  
  model.getById = function(id, cb, raw) {
    connection.get(name +'_'+ id, function(err, result) {
      if(err) throw err;
      
      if(raw) {
        cb(result);
      } else {
        cb(model.unserialize(result));  
      }
    });
  };
  
  model.unserialize = function(obj) {
    return obj.value;
  }
  
  // Retrieve design document to import existing views
  connection.getDesignDoc(name, function(err, doc) {
    // Merge with Model views
    
    if(doc && doc.views) {
      var views = doc.views;
    } else {
      var views = {};
    }
    
    model.indexes.forEach(function(index) {
      var key = 'by_'+ index;
      views[key] = { map: "function (doc, meta) {\n  if(doc._type == \'"+ name +"\') {\n    emit(doc."+ index +", doc);\n  }\n}" };
    });
    
    views['all'] = { map: "function (doc, meta) {\n  if(doc._type == \'"+ name +"\') {\n    emit(null, doc);\n  }\n}" };
    
    connection.setDesignDoc(name, { views: views }, function(err, results) {
      if(err) throw err;
      
    });
  });
  
  return model; 
};