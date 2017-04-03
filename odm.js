var uuid = require('node-uuid');

module.exports = {};

module.exports.views_config_path = '';
module.exports.views_config = {};

/*module.exports.setViewsConfig = function(path) {
  module.exports.views_config_path = path;

  module.exports.views_config = require('../../'+ path);
}*/

module.exports.createScheme = function(name, fields, connection, cb) {

  var model = function Model(values) {
    if(!values) values = {};
    
    for(key in fields) {
      if(values[key] == undefined) {
      	var type;

        if(typeof(fields[key]) == 'object') {
          type = fields[key].type;
        } else {
          type = fields[key];
        }

        if(type == String) {
          values[key] = '';
        } else if(type == Object) {
          values[key] = {};
        } else if(type == Array) {
          values[key] = [];
        }
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
	var fieldTypes = [String, Number, Array, Object, Date, Boolean];
  
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
	  
	  if(typeof(key) == 'string' || typeof(key) == 'number') {
        q.key = key;
      } else if(typeof(key) == 'object') {
	    q = key;
      }
      
      var return_single = true;
      if(q.return_single != undefined && q.return_single === false) {
        return_single = false;
      }
      
      view.query(q, function(err, results) {
        if(err) throw err;
        
        if(results[0] && results[0].value && isNaN(results[0].value) && !q.raw) {
	        // Regular document
        
	        results = results.map(model.unserialize);
	        
	        if(q.limit && q.limit == 1) {
		        cb(results[0]);
	        } else {
		        cb(results);
	        }
	    } else {
		    // Reduced result
		    
			if(results.length == 1 && return_single) {
				cb(results[0].value);
			} else {
				cb(results);
			}
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
  model.setViewFunc('all', 'all');
  
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
	  //connection.getDesignDoc(name, function(err, doc) {

    var views = module.exports.views_config[name];

    //connection.getDesignDoc(name, function(err, doc) {
	    // Merge with Model views
	    
	    /*if(doc && doc.views) {
	      var views = doc.views;
	    } else {
	      var views = {};
	    }*/
	
		  var indexViews = {};
	    model.indexes.forEach(function(index) {
	        var key = 'by_'+ index;
	        
	        if(!views[key]) {
	          indexViews[key] = { map: "function (doc, meta) {\n  if(doc._type == \'"+ name +"\') {\n    emit(doc."+ index +", doc);\n  }\n}" };
	        }
	      });
	      
	      for(var viewName in views) {

          if(!indexViews[viewName]) {
              views[viewName].map = views[viewName].map.toString();
              if(views[viewName].reduce) {
                views[viewName].reduce = views[viewName].reduce.toString();
              }

              indexViews[viewName] = views[viewName];
          }

	      };
	      
	      for(var viewName in indexViews) {
	        var funcName = '';
	        
	        viewName.split('_').forEach(function(comp) {
	          funcName += comp.charAt(0).toUpperCase() + comp.slice(1);
	        });
	        
	        funcName = funcName.charAt(0).toLowerCase() + funcName.slice(1)
	      
	        model.setViewFunc(viewName, funcName);
	      }
	      
	      if(!indexViews['all']) {
	        indexViews['all'] = { map: "function (doc, meta) {\n  if(doc._type == \'"+ name +"\') {\n    emit(doc._id, doc);\n  }\n}" };
	      }
	    
  	    connection.setDesignDoc(name, { views: indexViews }, function(err, results) {
  	      if(err) throw err;
  	      
  	      //cb(model);
  	    });
	  //});
	  
	  return this;
  }
  
  model.byId = function(id, cb, raw) {
    connection.get(name +'_'+ id, function(err, result) {
      if(err) cb(false);
      
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