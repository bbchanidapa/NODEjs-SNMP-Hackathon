var express = require('express')
var bodyParser = require('body-parser')
var app = express()
var cors = require('cors')
var snmp = require('snmp-native')
var moment = require('moment')
var firebase = require('firebase')
// setup firebase 
var config = {
    apiKey: "AIzaSyAbS66YpT_M3IHtIRDZFa-aH-u8JRQ_HUc",
    authDomain: "snmp-1521f.firebaseapp.com",
    databaseURL: "https://snmp-1521f.firebaseio.com",
    projectId: "snmp-1521f",
    storageBucket: "snmp-1521f.appspot.com",
    messagingSenderId: "815548380666"
  }
firebase.initializeApp(config)
app.use(cors())
app.use(bodyParser.json())

app.set('port', (process.env.PORT || 4000))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

setTimeout(function(){ getR124()   }, 1000)
setTimeout(function(){ getR330A()  }, 1000)
setTimeout(function(){ getR415()   }, 1000)
setTimeout(function(){ getSw4503() }, 1000)
setTimeout(function(){ getRshop()  }, 3000)

function getR124 () {
// os
let standard = {}
let r124 = new snmp.Session({ host: '10.77.1.2', community: 'public' })
r124.get({ oid: [1,3,6,1,2,1,1,1,0] }, function (err, varbinds) {
	standard = {
		date: moment().format("L") +" "+ moment().format("LT"),
		switch: 'R124',
		os: varbinds[0].value
	}
})
//Uptime
r124.get({ oid: [1,3,6,1,2,1,1,3,0] }, function (err, varbinds) {
/*	console.log(typeof varbinds[0].value.toString())*/
	let timetick = varbinds[0].value
	let min = parseInt(timetick / 6000)
	let hour = parseInt(timetick / 360000)
	standard.uptime = hour.toString() + " hours " + min.toString() + " min "
})
//CPU
r124.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
	standard.cpu = varbinds[0].value
})
//memory
r124.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
	//console.log('mem',varbinds[0].value)
	console.log(bytesToSize(varbinds[0].value))
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
r124.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	//console.log('temp',varbinds[0].value)
	standard.temp = varbinds[0].value

})

//inbound 
var inbound = []

r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
	// console.log('inbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			inbound: parseInt(varbinds[index].value/1048576)
		}
		inbound.push(data)
	}
	standard.inbound = inbound
})
//outbound 
var outbound = []
r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
	//console.log('outbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			outbound: parseInt(varbinds[index].value/1048576)
		}
		outbound.push(data)
	}
	standard.outbound = outbound

})

//status
var status = []
r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
	//console.log('status',varbinds[0].value)
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
	//standard.status = status

})
//name interface 
var interface = []
r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
    for (index in varbinds) {
    	interface.push(varbinds[index].value)
	}
    standard.interface = []
    for (index in interface) {
    	let data = {
    		interface: interface[index],
    		status: status[index],
    		indexOID: varbinds[index].oid[10]
    	}
    	standard.interface.push(data)
    }


 standard.total = []
 for (i in standard.interface) {
 	for (x in standard.inbound) {
 		if (standard.interface[i].indexOID === standard.inbound[x].indexOID) {
 			console.log(standard.interface[i], standard.interface[i].indexOID)
 			let item = {
 				interface: standard.interface[i].interface,
 				status: standard.interface[i].status,
 				inbound: standard.inbound[x].inbound,
 				outbound: standard.outbound[x].outbound
 			}
 			standard.total.push(item)
 		}
 	}
 }
 	firebase.database().ref('/R124').push(standard)
    r124.close()
})
}//******************************function*******************************

function getR330A () {
// os
let standard = {}
let r330a = new snmp.Session({ host: '10.77.3.2', community: 'public' })
r330a.get({ oid: [1,3,6,1,2,1,1,1,0] }, function (err, varbinds) {
	standard = {
		date: moment().format("L") +" "+ moment().format("LT"),
		switch: 'R330A',
		os: varbinds[0].value
	}
})
//Uptime
r330a.get({ oid: [1,3,6,1,2,1,1,3,0] }, function (err, varbinds) {
/*	console.log(typeof varbinds[0].value.toString())*/
	let timetick = varbinds[0].value
	let min = parseInt(timetick / 6000)
	let hour = parseInt(timetick / 360000)
	standard.uptime = hour.toString() + " hours " + min.toString() + " min "
})
//CPU
r330a.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
	standard.cpu = varbinds[0].value
})
//memory
r330a.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
	//console.log('mem',varbinds[0].value)
	console.log(bytesToSize(varbinds[0].value))
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
r330a.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	//console.log('temp',varbinds[0].value)
	standard.temp = varbinds[0].value

})

//inbound 
var inbound = []

r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
	// console.log('inbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			inbound: parseInt(varbinds[index].value/1048576)
		}
		inbound.push(data)
	}
	standard.inbound = inbound
})
//outbound 
var outbound = []
r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
	//console.log('outbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			outbound: parseInt(varbinds[index].value/1048576)
		}
		outbound.push(data)
	}
	standard.outbound = outbound

})

//status
var status = []
r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
	//console.log('status',varbinds[0].value)
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
	//standard.status = status

})
//name interface 
var interface = []
r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
    for (index in varbinds) {
    	interface.push(varbinds[index].value)
	}
    standard.interface = []
    for (index in interface) {
    	let data = {
    		interface: interface[index],
    		status: status[index],
    		indexOID: varbinds[index].oid[10]
    	}
    	standard.interface.push(data)
    }


 standard.total = []
 for (i in standard.interface) {
 	for (x in standard.inbound) {
 		if (standard.interface[i].indexOID === standard.inbound[x].indexOID) {
 			console.log(standard.interface[i], standard.interface[i].indexOID)
 			let item = {
 				interface: standard.interface[i].interface,
 				status: standard.interface[i].status,
 				inbound: standard.inbound[x].inbound,
 				outbound: standard.outbound[x].outbound
 			}
 			standard.total.push(item)
 		}
 	}
 }
 	firebase.database().ref('/R330A').push(standard)
    r330a.close()
})
}//******************************function*******************************

function getR415 () {
// os
let standard = {}
let r415 = new snmp.Session({ host: '10.77.5.2', community: 'public' })
r415.get({ oid: [1,3,6,1,2,1,1,1,0] }, function (err, varbinds) {
	standard = {
		date: moment().format("L") +" "+ moment().format("LT"),
		switch: 'R415',
		os: varbinds[0].value
	}
})
//Uptime
r415.get({ oid: [1,3,6,1,2,1,1,3,0] }, function (err, varbinds) {
/*	console.log(typeof varbinds[0].value.toString())*/
	let timetick = varbinds[0].value
	let min = parseInt(timetick / 6000)
	let hour = parseInt(timetick / 360000)
	standard.uptime = hour.toString() + " hours " + min.toString() + " min "
})
//CPU
r415.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
	standard.cpu = varbinds[0].value
})
//memory
r415.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
	//console.log('mem',varbinds[0].value)
	console.log(bytesToSize(varbinds[0].value))
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
r415.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	//console.log('temp',varbinds[0].value)
	standard.temp = varbinds[0].value

})

//inbound 
var inbound = []

r415.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
	// console.log('inbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			inbound: parseInt(varbinds[index].value/1048576)
		}
		inbound.push(data)
	}
	standard.inbound = inbound
})
//outbound 
var outbound = []
r415.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
	//console.log('outbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			outbound: parseInt(varbinds[index].value/1048576)
		}
		outbound.push(data)
	}
	standard.outbound = outbound

})

//status
var status = []
r415.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
	//console.log('status',varbinds[0].value)
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
	//standard.status = status

})
//name interface 
var interface = []
r415.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
    for (index in varbinds) {
    	interface.push(varbinds[index].value)
	}
    standard.interface = []
    for (index in interface) {
    	let data = {
    		interface: interface[index],
    		status: status[index],
    		indexOID: varbinds[index].oid[10]
    	}
    	standard.interface.push(data)
    }


 standard.total = []
 for (i in standard.interface) {
 	for (x in standard.inbound) {
 		if (standard.interface[i].indexOID === standard.inbound[x].indexOID) {
 			console.log(standard.interface[i], standard.interface[i].indexOID)
 			let item = {
 				interface: standard.interface[i].interface,
 				status: standard.interface[i].status,
 				inbound: standard.inbound[x].inbound,
 				outbound: standard.outbound[x].outbound
 			}
 			standard.total.push(item)
 		}
 	}
 }
 	firebase.database().ref('/R415').push(standard)
    r415.close()
})
}//******************************function*******************************

function getSw4503 () {
// os
let standard = {}
let sw4503 = new snmp.Session({ host: '10.77.4.1', community: 'public' })
sw4503.get({ oid: [1,3,6,1,2,1,1,1,0] }, function (err, varbinds) {
	standard = {
		date: moment().format("L") +" "+ moment().format("LT"),
		switch: 'SW4503',
		os: varbinds[0].value
	}
})
//Uptime
sw4503.get({ oid: [1,3,6,1,2,1,1,3,0] }, function (err, varbinds) {
/*	console.log(typeof varbinds[0].value.toString())*/
	let timetick = varbinds[0].value
	let min = parseInt(timetick / 6000)
	let hour = parseInt(timetick / 360000)
	standard.uptime = hour.toString() + " hours " + min.toString() + " min "
})
//CPU
sw4503.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
	standard.cpu = varbinds[0].value
})
//memory
sw4503.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
	//console.log('mem',varbinds[0].value)
	console.log(bytesToSize(varbinds[0].value))
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
sw4503.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	//console.log('temp',varbinds[0].value)
	standard.temp = varbinds[0].value

})

//inbound 
var inbound = []

sw4503.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
	// console.log('inbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			inbound: parseInt(varbinds[index].value/1048576)
		}
		inbound.push(data)
	}
	standard.inbound = inbound
})
//outbound 
var outbound = []
sw4503.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
	//console.log('outbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			outbound: parseInt(varbinds[index].value/1048576)
		}
		outbound.push(data)
	}
	standard.outbound = outbound

})

//status
var status = []
sw4503.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
	//console.log('status',varbinds[0].value)
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
	//standard.status = status

})
//name interface 
var interface = []
sw4503.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
    for (index in varbinds) {
    	interface.push(varbinds[index].value)
	}
    standard.interface = []
    for (index in interface) {
    	let data = {
    		interface: interface[index],
    		status: status[index],
    		indexOID: varbinds[index].oid[10]
    	}
    	standard.interface.push(data)
    }


 standard.total = []
 for (i in standard.interface) {
 	for (x in standard.inbound) {
 		if (standard.interface[i].indexOID === standard.inbound[x].indexOID) {
 			console.log(standard.interface[i], standard.interface[i].indexOID)
 			let item = {
 				interface: standard.interface[i].interface,
 				status: standard.interface[i].status,
 				inbound: standard.inbound[x].inbound,
 				outbound: standard.outbound[x].outbound
 			}
 			standard.total.push(item)
 		}
 	}
 }
 	firebase.database().ref('/SW4503').push(standard)
    sw4503.close()
})
}//******************************function*******************************

function getRshop () {
// os
let standard = {}
let rshop = new snmp.Session({ host: '10.77.8.2', community: 'public' })
rshop.get({ oid: [1,3,6,1,2,1,1,1,0] }, function (err, varbinds) {
	standard = {
		date: moment().format("L") +" "+ moment().format("LT"),
		switch: 'Rshop',
		os: varbinds[0].value
	}
})
//Uptime
rshop.get({ oid: [1,3,6,1,2,1,1,3,0] }, function (err, varbinds) {
/*	console.log(typeof varbinds[0].value.toString())*/
	let timetick = varbinds[0].value
	let min = parseInt(timetick / 6000)
	let hour = parseInt(timetick / 360000)
	standard.uptime = hour.toString() + " hours " + min.toString() + " min "
})
//CPU
rshop.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
	standard.cpu = varbinds[0].value
})
//memory
rshop.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
	//console.log('mem',varbinds[0].value)
	console.log(bytesToSize(varbinds[0].value))
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
rshop.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	//console.log('temp',varbinds[0].value)
	standard.temp = varbinds[0].value

})

//inbound 
var inbound = []

rshop.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
	// console.log('inbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			inbound: parseInt(varbinds[index].value/1048576)
		}
		inbound.push(data)
	}
	standard.inbound = inbound
})
//outbound 
var outbound = []
rshop.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
	//console.log('outbound',varbinds)
	for (index in varbinds) {
		let data = {
			indexOID: varbinds[index].oid[10],
			outbound: parseInt(varbinds[index].value/1048576)
		}
		outbound.push(data)
	}
	standard.outbound = outbound

})

//status
var status = []
rshop.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
	//console.log('status',varbinds[0].value)
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
	//standard.status = status

})
//name interface 
var interface = []
rshop.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
    for (index in varbinds) {
    	interface.push(varbinds[index].value)
	}
    standard.interface = []
    for (index in interface) {
    	let data = {
    		interface: interface[index],
    		status: status[index],
    		indexOID: varbinds[index].oid[10]
    	}
    	standard.interface.push(data)
    }


 standard.total = []
 for (i in standard.interface) {
 	for (x in standard.inbound) {
 		if (standard.interface[i].indexOID === standard.inbound[x].indexOID) {
 			console.log(standard.interface[i], standard.interface[i].indexOID)
 			let item = {
 				interface: standard.interface[i].interface,
 				status: standard.interface[i].status,
 				inbound: standard.inbound[x].inbound,
 				outbound: standard.outbound[x].outbound
 			}
 			standard.total.push(item)
 		}
 	}
 }
 	firebase.database().ref('/Rshop').push(standard)
    rshop.close()
})
}//******************************function*******************************


function bytesToSize(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
   if (bytes == 0) return '0 Byte'
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
}

app.listen(app.get('port'), function () {
  console.log('run at port', app.get('port'))
})