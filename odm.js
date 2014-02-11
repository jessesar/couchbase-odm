var uuid = require('node-uuid');

module.exports = {};

module.exports.createModel = function(name, fields, connection, cb) {

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

	if(!this._id) {
	    this._id = uuid.v4();
	}
	
    this._type = name;
  };
  
  model.statics = {};
  
  model.validateField = function(field) {
	var fieldTypes = [String, Number, Array, Date];
  
    if(fieldTypes.indexOf(field) == -1) throw "Invalid field type: "+ field;
    return true;
  }
  
  model.setViewFunc = function(viewName, funcName) {
    model[funcName] = function (key, options, cb) {      
      var view = connection.view(name, viewName);
	  
      if(typeof(key) == 'function') {
	    cb = key;
	  }
	  
	  var q = {};
	  
      if(typeof(options) == 'function') {
	    cb = options;
	  } else {
	    if(typeof(options) == 'object') {
		  q = options;
		}
	  }
	  
	  if(typeof(key) == 'string') {
        q.key = key;
      } else if(typeof(key) == 'object') {
	    q = key;
      }
      
      view.query(q, function(err, results) {
        if(err) throw err;
        
        results = results.map(model.unserialize);
        
        if(q.limit && q.limit == 1) {
	        cb(results[0]);
        } else {
	        cb(results);
        }
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
  
  model.prototype.remove = function(cb) {
	  connection.remove(this._type +'_'+ this._id, function(err, result) {
		  if(err) throw err;
		  
		  if(cb) {
			  cb(result);
		  }
	  });
  };
  
  model.setupViews = function() {
	  // Retrieve design document to import existing views
	  connection.getDesignDoc(name, function(err, doc) {
	    // Merge with Model views
	    
	    if(doc && doc.views) {
	      var views = doc.views;
	    } else {
	      var views = {};
	    }
	
		var indexViews = {};
	    model.indexes.forEach(function(index) {
	      var key = 'by_'+ index;
	      indexViews[key] = { map: "function (doc, meta) {\n  if(doc._type == \'"+ name +"\') {\n    emit(doc."+ index +", doc);\n  }\n}" };
	    });
	    
	    for(var viewName in views) {
		    if(viewName != 'all') {
			    if(!indexViews[viewName]) {
				    
				    indexViews[viewName] = views[viewName];
					
				}
				
			}
	    };
	    
	    for(var viewName in indexViews) {
		    var funcName = 'get';
				
			viewName.split('_').forEach(function(comp) {
				funcName += comp.charAt(0).toUpperCase() + comp.slice(1);
			});
		
			model.setViewFunc(viewName, funcName);
	    }
	    
	    indexViews['all'] = { map: "function (doc, meta) {\n  if(doc._type == \'"+ name +"\') {\n    emit(null, doc);\n  }\n}" };
	    
	    connection.setDesignDoc(name, { views: indexViews }, function(err, results) {
	      if(err) throw err;
	      
	      //cb(model);
	    });
	  });
	  
	  return this;
  }
  
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
    return new model(obj.value);
  }
  
  return model; 
};