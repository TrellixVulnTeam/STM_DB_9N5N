// Copyright 2015-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

var extend = require('lodash').assign;
var mysql = require('mysql');
var config = require('../config');
//ADDED BY ERIK TO MAKE HIS FUNCTION WORK:
var request = require('request');


function getConnection () {
    return mysql.createConnection(extend({
		database: 'STM_DB'
		    }, {
		host: config.get('MYSQL_HOST'),
		    user: config.get('MYSQL_USER'),
		    password: config.get('MYSQL_PASSWORD')
		    }));
}

function getGrades(req,cb){
    console.log("in getGrades in model");
    var allGrades = ['K','1','2','3','4','5','6','7','8'];
    var l = allGrades.length;
    var count = 0;
    var toRet = "";
    getGradesHelper(req,allGrades,l,count,toRet,function(err, results){
	    if(err){
		return cb(err);
	    }
	    console.log("returning from getGrades:");
	    console.log(results);
	    cb(results);
	});
}

function getGradesHelper(req,allGrades,l,count,toRet,cb){
    console.log("in getGradesHelper");
    if(count >= l){
	console.log("COUNT is >= l");
	console.log("returning from getGradesHelper: ");
	console.log(toRet);
	cb(toRet);
    }else{
	getGrade(req,allGrades[count],function(err, results){
		if(err){
		    return cb(err);
		}
		toRet += results;
		getGradesHelper(req,allGrades,l,count+1,toRet,cb);
	    });
    }    
}

function getGrade(req,g,cb){
    console.log('in getGrade for ' + g);
    var connection = getConnection();
    //first thing- get the # of sections in a grade.
    var year = req.app.get('year');
    var toRet = "";
    connection.query("select distinct section.sectionID from staff natural join teaches natural join section where section.year = '"+year+"' and section.grade = '"+g+"';",
		     function (err, results){
			 if (err){
			     return cb(err);
			 }
			 console.log(results);
			 var len = results.length;
			 console.log("we found " + len + " classes for grade " + g);
			 getSections(results,len,year, function(err, sects){
				 if(err){return cb(err);}
				 console.log("**************** the return value from getSections for grade " + g + " was: ");
				 console.log(sects);
				 cb(sects); 
			     });
		     });
    connection.end();
}

function getSections(sections,len,year, cb){
    //use recursive helper function to do this
    console.log("in getSections");
    var sects = [];
    var i = 0;
    for(var sectionID in sections){
	console.log(sectionID);
	sects[i] = sectionID; i++;
    }
    var ret = "";
    var con = getConnection();
    getSectionsHelper(sects,0,len,ret,year,function(err,results){
	    if(err){
		return cb(err);
	    }
	    console.log("WOOPEEEEEEEEEEEEEEEEEEEEEEEEE###########");
	    console.log(results.payload);
	    cb(results);
	});
    con.end();
}

function getSectionsHelper(sections,i,len,ret,year,cb){
    var con = getConnection();
    console.log("in getSectionsHelper");
    if(i >= len){
	console.log("finally returning from getSectionsHelper back to getSections: ");
	console.log(String(ret));
	//console.log(Object.keys(ret));
	console.log(typeof ret);
	var msg = {
	    payload: "hello",
	    writeable: true
	
	};

	request(url,body,function(err){
		if(err) {
		    throw err;
		}
		return cb("hello"); // You should call your callback inside request callback, because it's an async operation
	    }); 

	//console.log(Object.keys(JSON.parse(ret)));
	//ret.defineProperties('writable','true');
	//cb(msg);
	//return cb(msg);
	//cb("");
    }else{
	var sect = sections[i];
	console.log("querying on : " + sect + ", " + year);
	//get teacher & students for section[i];
	con.query("select staff.firstName, staff.lastName from staff natural join teaches natural join section where section.sectionID = '"+sect+"' and year = '"+year+"';" , function(err, result){
		if(err){
		    return cb(err);
		}
		ret += '{"sectionID":' + sect + ',"teacher":';
		console.log(result[0]);
		ret += JSON.stringify(result[0]);
		var fName,lName = "def";

		//if(result[0]){
		//fName = JSON.parse(result[0].payload).firstName;
		//lName = JSON.parse(result[0].payload).lastName;
		//}
		//console.log("FNAME: " + fName);
		//console.log("LNAME: " + lName);
		ret += ",";
		console.log(ret);
		var con2 = getConnection();
		con2.query("select student.firstName, student.lastName, student.sex, student.dial4, ydsd.classroomBehavior from student natural join takes natural join section natural join ydsd where section.sectionID = '"+sections[i]+"' and year = '"+year+"';" , 
			  function(err, result2){
			      if(err){return cb(err);}
			      ret += '"students":[';
			      for(var r in result2){
				  console.log(result2[r]);
				  ret += JSON.stringify(result2[r]);
			      }
			      ret += ']}';
			      if(i+1 != len){ret += ',';}
			      getSectionsHelper(sections,i+1,len,ret,year,cb);
			  });
		con2.end();
	    });
    }
    con.end();
}


function getStudents (req,grade,prev, cb) {
    console.log("in getStudents");
    var connection = getConnection();
    if(parseInt(prev) == 1){
	if(grade == '1'){
	    grade = 'K';
	}else{
	    try{
		grade = parseInt(grade) -1;
	    }
	    catch(err){
		console.log(err.message);
	    }
	}
    }
    var year = req.app.get('year'); 
    //console.log("year is: " + year);
    //console.log("grade is: " + grade);
    connection.query(
		     'select SEX, firstName, lastName, dial4, ydsd.classroomBehavior as behaviorObservation from student natural join ydsd where ydsd.grade = '+grade+' and year = '+year+'; ',
		     function (err, results) {
			 console.log('results: ' + results);
			 if (err) {
			     return cb(err);
			 }
			 cb(null, results);
		     }
		     );
    connection.end();
}

function getTeachers (grade, cb) {
    var connection = getConnection();
    connection.query(
		     'SELECT * FROM `staff` where grade = '+grade+'',
		     function (err, results) {
			 if (err) {
			     return cb(err);
			 }
			 cb(null, results);
		     }
		     );
    connection.end();
}

// [START list]
function listclass (limit, token, cb) {
    token = token ? parseInt(token, 10) : 0;
    var connection = getConnection();
    connection.query(
		     'SELECT * FROM `class` LIMIT ? OFFSET ?', [limit, token],
		     function (err, results) {
			 if (err) {
			     return cb(err);
			 }
			 var hasMore = results.length === limit ? token + results.length : false;
			 cb(null, results, hasMore);
		     }
		     );
    connection.end();
}

function liststaff (limit, token, cb) {
    token = token ? parseInt(token, 10) : 0;
    var connection = getConnection();
    connection.query(
		     'SELECT * FROM `staff` LIMIT ? OFFSET ?', [limit, token],
		     function (err, results) {
			 if (err) {
			     return cb(err);
			 }
			 var hasMore = results.length === limit ? token + results.length : false;
			 cb(null, results, hasMore);
		     }
		     );
    connection.end();
}

function liststudents (cb) {
  var connection = getConnection();
  connection.query(
    'SELECT `id`, `lastName`, `firstName`, `DOB` FROM `student`',
    function (err, results) {
      if (err) {
        return cb(err);
      }
      cb(null, results);
    }
  );
  connection.end();
}

/**************************/
function selectStudent (id,cb){
  var connection = getConnection();
  connection.query('SELECT * FROM `student`,`ydsd` WHERE `student`.`id` = ?', id, function(err,results){
    if (err) {
        return cb(err);
      }
      if (!results.length) {
        return cb({
          code: 404,
          message: 'Not found'
        });
      }
      cb(null, results[0]);
    });
  connection.end();
}

function selectStaff (id,cb){
    var connection = getConnection();
    connection.query('SELECT * FROM `staff` WHERE `staff`.`emailID` = ?', id, function(err,results){
	    if (err) {
		return cb(err);
	    }
	    if (!results.length) {
		return cb({
			code: 404,
			    message: 'Not found'
			    });
	    }
	    cb(null, results[0]);
	});
    connection.end();
}

function selectGrade(grade,cb){
  var connection = getConnection();
  connection.query('SELECT * FROM student natural join ydsd  WHERE ydsd.grade = ?',grade,function(err,results){
    if (err) {
        return cb(err);
      }
      if (!results.length) {
        return cb({
          code: 404,
          message: 'Not found'
        });
      }
      cb(null, results[0]);
    });
  connection.end();
}

/*************************/
function listtakes (limit, token, cb) {
    token = token ? parseInt(token, 10) : 0;
    var connection = getConnection();
    connection.query(
		     'SELECT * FROM `takes` LIMIT ? OFFSET ?', [limit, token],
		     function (err, results) {
			 if (err) {
			     return cb(err);
			 }
			 var hasMore = results.length === limit ? token + results.length : false;
			 cb(null, results, hasMore);
		     }
		     );
    connection.end();
}

function listteaches (limit, token, cb) {
    token = token ? parseInt(token, 10) : 0;
    var connection = getConnection();
    connection.query(
		     'SELECT * FROM `teaches` LIMIT ? OFFSET ?', [limit, token],
		     function (err, results) {
			 if (err) {
			     return cb(err);
			 }
			 var hasMore = results.length === limit ? token + results.length : false;
			 cb(null, results, hasMore);
		     }
		     );
    connection.end();
}

function read (id, cb) {
    var connection = getConnection();
    connection.query(
		     'SELECT * FROM `student` WHERE `id` = ?', id, function (err, results) {
			 if (err) {
			     return cb(err);
			 }
			 if (!results.length) {
			     return cb({
				     code: 404,
					 message: 'Not found'
					 });
			 }
			 cb(null, results[0]);
		     });
    connection.end();
}

function readstaff (id, cb) {
    var connection = getConnection();
    connection.query(
		     'SELECT * FROM `staff` WHERE `id` = ?', id, function (err, results) {
			 if (err) {
			     return cb(err);
			 }
			 if (!results.length) {
			     return cb({
				     code: 404,
					 message: 'Not found'
					 });
			 }
			 cb(null, results[0]);
		     });
    connection.end();
}

// [START update]
function update (id, data, cb) {
    var connection = getConnection();
    connection.query(
		     'UPDATE `books` SET ? WHERE `id` = ?', [data, id], function (err) {
			 if (err) {
			     return cb(err);
			 }
			 read(id, cb);
		     });
    connection.end();
}
// [END update]

function _delete (id, cb) {
    var connection = getConnection();
    connection.query('DELETE FROM `books` WHERE `id` = ?', id, cb);
    connection.end();
}

module.exports = {
    getStudents: getStudents,
    getTeachers: getTeachers,
    listclass: listclass,
    liststaff: liststaff,
    liststudents: liststudents,
    selectStudent: selectStudent,
    selectStaff: selectStaff,
    selectGrade: selectGrade,
    read: read,
    getGrades: getGrades,
    getGradesHelper: getGradesHelper,
    getGrade: getGrade,
    getSections: getSections,
    getSectionsHelper: getSectionsHelper,
};
