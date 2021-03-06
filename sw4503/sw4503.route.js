var express = require('express')
var router = express.Router()
var snmp = require('snmp-native')
var moment = require('moment')

router.get('/sw4503', function (req, res) {
// os
let dataSw4503 = []
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

    
	// console.log('length ', standard.interface.length)
    sw4503.close()
	res.send(standard)
})

}) // get close

function bytesToSize(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
   if (bytes == 0) return '0 Byte'
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
}

module.exports = router