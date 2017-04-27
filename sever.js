var express = require('express')
var bodyParser = require('body-parser')
var app = express()
var cors = require('cors')
var snmp = require('snmp-native')
var moment = require('moment')
var axios = require('axios')

app.use(cors())
app.use(bodyParser.json())

app.set('port', (process.env.PORT || 3000))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

var delayMillis = 1000
var detail = []
var detailInterface = []
var deviceTraffic = []

/*setTimeout(function(){ getR124 () },1000)
setTimeout(function(){ getR330A () },2000)
setTimeout(function(){ getR101C () },3000) 
setTimeout(function(){ getR415 () },4000)
setTimeout(function(){ getSw4503 () },5000)
setTimeout(function(){ getRshop () },6000)*/
//setInterval(function(){	getSw4503 () },10000)

//setInterval(function(){ getR124 () },300000)
getR124 ()
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
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
r124.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	standard.temp = varbinds[0].value
})
//inbound 
var inbound = []
r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
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
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
})
//name interface 
var interface = []
r124.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {

	//************* inboundAll && outboundAll *************
 	let inboundTotal = 0
	let outboundTotal = 0
	let inputTraffic = {}
	for (index in inbound) {	
		inboundTotal += inbound[index].inbound
		outboundTotal += outbound[index].outbound
	}
	inboundTotal = convert (inboundTotal)
	outboundTotal = convert (outboundTotal)
	inputTraffic.traffic = {inbound:inboundTotal,outbound:outboundTotal}

	console.log('r124',inputTraffic.traffic )
	to_device({'10.77.1.2':inputTraffic.traffic})
	//************* inboundAll && outboundAll *************

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
    	//************************Top Rank**************************** 
    	let str1 = inboundTotal
    	let str2 = outboundTotal 	 
    	let inbound_ = str1.split(" ")
    	let outbound_ = str2.split(" ")
    	 if (varbinds[index].oid[10] == 11) {
	     	console.log('B1-01A' ,'10.1.201.0',Math.floor(parseFloat(inbound_[0]+outbound_[0])) ,'Kbps') 
	     }	     
	     //************************Top Rank****************************  
    	standard.interface.push(data)
    }
      
     //************************standard.total****************************
	 standard.total = []
	 for (i in standard.interface) {
	 	for (x in standard.inbound) {
	 		if (standard.interface[i].indexOID === standard.inbound[x].indexOID) {
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

	 to_interface({ip:"10.77.1.2",detail:standard.total})	

	//************* detail *************
	let data = {
 		ip: '10.77.1.2',
 		ios: standard.os,
 		uptime: standard.uptime,
 		cpu: standard.cpu,
 		mem: standard.mem,
 		temp: standard.temp
 	}
	post_device (data)

    r124.close()
})
	setTimeout(function(){ getR330A () },2000)
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
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
r330a.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	standard.temp = varbinds[0].value
})
//inbound 
var inbound = []
r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
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
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
})
//name interface 
var interface = []
r330a.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
	//************* inboundAll && outboundAll *************
 	let inboundTotal = 0
	let outboundTotal = 0
	let inputTraffic = {}
	for (index in inbound) {	
		inboundTotal += inbound[index].inbound
		outboundTotal += outbound[index].outbound
	}
	inboundTotal = convert (inboundTotal)
	outboundTotal = convert (outboundTotal)
	standard.inboundAll = inboundTotal
	standard.outboundAll = outboundTotal
	inputTraffic.traffic = {inbound:inboundTotal,outbound:outboundTotal}

	console.log('r330a',inputTraffic.traffic )
	to_device({'10.77.3.2':inputTraffic.traffic})
	//************* inboundAll && outboundAll *************

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
    	//************************Top Rank**************************** 
    	let str1 = inboundTotal
    	let str2 = outboundTotal 	 
    	let inbound_ = str1.split(" ")
    	let outbound_ = str2.split(" ")
    	 if (varbinds[index].oid[10] == 31) {
	     	console.log('Vlan31' ,'10.3.24 0/24',Math.floor(parseFloat(inbound_[0]+outbound_[0])) ,'Kbps') 
	     }	
	     else if (varbinds[index].oid[10] == 32) {
	     	console.log('Vlan32' ,'10.3.25 0/24',Math.floor(parseFloat(inbound_[0]+outbound_[0])) ,'Kbps') 
	     }  
	     else if (varbinds[index].oid[10] == 33) {
	     	console.log('Vlan33' ,'10.3.27 0/24',Math.floor(parseFloat(inbound_[0]+outbound_[0])) ,'Kbps') 
	     }   
	     else if (varbinds[index].oid[10] == 34) {
	     	console.log('Vlan34' ,'10.3.230 0/24',Math.floor(parseFloat(inbound_[0]+outbound_[0])) ,'Kbps') 
	     } 
	     else if (varbinds[index].oid[10] == 35) {
	     	console.log('Vlan35' ,'10.3.32 0/24',Math.floor(parseFloat(inbound_[0]+outbound_[0])) ,'Kbps') 
	     } 
	     else if (varbinds[index].oid[10] == 36) {
	     	console.log('Vlan36' ,'10.3.91 0/24',Math.floor(parseFloat(inbound_[0]+outbound_[0])) ,'Kbps') 
	     }  
	     else if (varbinds[index].oid[10] == 37) {
	     	console.log('Vlan37' ,'10.3.92 0/24',Math.floor(parseFloat(inbound_[0]+outbound_[0])) ,'Kbps') 
	     } 
	     else if (varbinds[index].oid[10] == 38) {
	     	console.log('Vlan38' ,'10.3.160 0/24',Math.floor(parseFloat(inbound_[0]+outbound_[0])) ,'Kbps') 
	     }      
	     //************************Top Rank****************************  
    }

	 standard.total = []
	 for (i in standard.interface) {
	 	for (x in standard.inbound) {
	 		if (standard.interface[i].indexOID === standard.inbound[x].indexOID) {
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
	 to_interface({ip:"10.77.3.2",detail:standard.total})	

	//************* detail *************
	let data = {
 		ip: '10.77.3.2',
 		ios: standard.os,
 		uptime: standard.uptime,
 		cpu: standard.cpu,
 		mem: standard.mem,
 		temp: standard.temp
 	}
	post_device (data)

    r330a.close()
})  //getR101C ()
	setTimeout(function(){ getR101C () },3000)
}//******************************function*******************************

function getR101C () {
// os
let standard = {}
let r101c = new snmp.Session({ host: '10.77.7.2', community: 'public' })
r101c.get({ oid: [1,3,6,1,2,1,1,1,0] }, function (err, varbinds) {
	standard = {
		date: moment().format("L") +" "+ moment().format("LT"),
		switch: 'R101C',
		os: varbinds[0].value
	}
})
//Uptime
r101c.get({ oid: [1,3,6,1,2,1,1,3,0] }, function (err, varbinds) {
	let timetick = varbinds[0].value
	let min = parseInt(timetick / 6000)
	let hour = parseInt(timetick / 360000)
	standard.uptime = hour.toString() + " hours " + min.toString() + " min "
})
//CPU
r101c.get({ oid: [1,3,6,1,4,1,9,9,109,1,1,1,1,5,1] }, function (err, varbinds) {
	standard.cpu = varbinds[0].value
})
//memory
r101c.get({ oid: [1,3,6,1,4,1,9,9,48,1,1,1,5,1] }, function (err, varbinds) {
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
r101c.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	standard.temp = varbinds[0].value

})
//inbound 
var inbound = []

r101c.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
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
r101c.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,16] }, function (err, varbinds) {
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
r101c.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,8] }, function (err, varbinds) {
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
})
//name interface 
var interface = []
r101c.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,2] }, function (err, varbinds) {
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
	 to_interface({ip:"10.77.7.2",detail:standard.total})	
 	//************* inboundAll && outboundAll *************
 	let inboundTotal = 0
	let outboundTotal = 0
	let inputTraffic = {}
	for (index in inbound) {	
		inboundTotal += inbound[index].inbound
		outboundTotal += outbound[index].outbound
	}
	inboundTotal = convert (inboundTotal)
	outboundTotal = convert (outboundTotal)
	standard.inboundAll = inboundTotal
	standard.outboundAll = outboundTotal
	inputTraffic.traffic = {inbound:inboundTotal,outbound:outboundTotal}

	console.log('r101c',inputTraffic.traffic)
	to_device({'10.77.7.2':inputTraffic.traffic})
	//************* detail *************
	let data = {
 		ip: '10.77.7.2',
 		ios: standard.os,
 		uptime: standard.uptime,
 		cpu: standard.cpu,
 		mem: standard.mem,
 		temp: standard.temp
 	}
	post_device (data)

    r101c.close()
})
	setTimeout(function(){ getR415 () },4000)
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
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
r415.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	standard.temp = varbinds[0].value

})
//inbound 
var inbound = []

r415.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
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
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
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
	 to_interface({ip:"10.77.5.2",detail:standard.total})	
 	//************* inboundAll && outboundAll *************
 	let inboundTotal = 0
	let outboundTotal = 0
	let inputTraffic = {}
	for (index in inbound) {	
		inboundTotal += inbound[index].inbound
		outboundTotal += outbound[index].outbound
	}
	inboundTotal = convert (inboundTotal)
	outboundTotal = convert (outboundTotal)
	standard.inboundAll = inboundTotal
	standard.outboundAll = outboundTotal
	inputTraffic.traffic = {inbound:inboundTotal,outbound:outboundTotal}

	console.log('r415',inputTraffic.traffic)
	to_device({'10.77.5.2':inputTraffic.traffic})
	//************* detail *************
	let data = {
 		ip: '10.77.5.2',
 		ios: standard.os,
 		uptime: standard.uptime,
 		cpu: standard.cpu,
 		mem: standard.mem,
 		temp: standard.temp
 	}
	post_device (data)

    r415.close()
})
	setTimeout(function(){ getSw4503 () },5000)
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
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
sw4503.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	standard.temp = varbinds[0].value
})

//inbound 
var inbound = []

sw4503.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
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
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
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
	  to_interface({ip:"10.77.4.1",detail:standard.total})	
    //************* inboundAll && outboundAll *************
 	let inboundTotal = 0
	let outboundTotal = 0
	let inputTraffic = {}
	for (index in inbound) {	
		inboundTotal += inbound[index].inbound
		outboundTotal += outbound[index].outbound
	}
	inboundTotal = convert (inboundTotal)
	outboundTotal = convert (outboundTotal)
	inputTraffic.traffic = {inbound:inboundTotal,outbound:outboundTotal}

	console.log('sw4503',inputTraffic.traffic)
	to_device({'10.77.4.1':inputTraffic.traffic})

	//************* POST to Sw4503 *************
	let arr = [moment().format("L"), moment().format("LT"),JSON.stringify( {inbound:inboundTotal,outbound:outboundTotal} ) ]
	postSheet ("1Oykec18xewJw68XbG3xzJ3DU1N3mMqf6l7jBUwZ58Zs",arr)
	//************* detail *************
	let data = {
 		ip: '10.77.4.1',
 		ios: standard.os,
 		uptime: standard.uptime,
 		cpu: standard.cpu,
 		mem: standard.mem,
 		temp: standard.temp
 	}
	post_device (data)

    sw4503.close()
})
	setTimeout(function(){ getRshop () },6000)
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
	standard.mem = bytesToSize(varbinds[0].value)
})
//temp
rshop.getSubtree({ oid: [1,3,6,1,4,1,9,9,13,1,3,1,3] }, function (err, varbinds) {
	standard.temp = varbinds[0].value
})
//inbound 
var inbound = []

rshop.getSubtree({ oid: [1,3,6,1,2,1,2,2,1,10] }, function (err, varbinds) {
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
	for (index in varbinds) {
		if(varbinds[index].value == 1){	
    		status.push('Up') 
		}
		else if (varbinds[index].value == 2) {
			status.push('Down')
		}
	}
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
	 to_interface({ip:"10.77.8.2",detail:standard.total})		
    //************* inboundAll && outboundAll *************
 	let inboundTotal = 0
	let outboundTotal = 0
	let inputTraffic = {}
	for (index in inbound) {	
		inboundTotal += inbound[index].inbound
		outboundTotal += outbound[index].outbound
	}
	inboundTotal = convert (inboundTotal)
	outboundTotal = convert (outboundTotal)
	standard.inboundAll = inboundTotal
	standard.outboundAll = outboundTotal
	inputTraffic.traffic = {inbound:inboundTotal,outbound:outboundTotal}

	console.log('rshop',inputTraffic.traffic)
	to_device({'10.77.8.2':inputTraffic.traffic})
	//************* detail *************
	let data = {
 		ip: '10.77.8.2',
 		ios: standard.os,
 		uptime: standard.uptime,
 		cpu: standard.cpu,
 		mem: standard.mem,
 		temp: standard.temp
 	}
	post_device (data)

    rshop.close()
})
}//******************************function*******************************


	//***************** Function Post Sheet interface ********************
	/*function to_topRanking (data_) {

	}
*/
	//***************** Function Post Sheet interface ********************
	function to_device (data_) {
		let count = deviceTraffic.length
	 	if (count == 5) {
	 		console.log('*******POST to_device #',count,'Success!!!!********')
	 		deviceTraffic.push(data_)
	 		let arr = [moment().format("L"), moment().format("LT"),JSON.stringify(deviceTraffic)]
			postSheet ("1NMm2wWvoWD9GPzXzSU9jtJBLURyl3N0Nki3XOe4AovM",arr) 
			
	 	}else {
	 		deviceTraffic.push(data_)
	 	}	 
	}
	//***************** Function Post Sheet interface ********************
	function to_interface (data_) {
		let count = detailInterface.length
	 	if (count == 5) {
	 		console.log('*******POST to_interface #',count,'Success!!!!********')
	 		detailInterface.push(data_)
	 		let arr = [moment().format("L"), moment().format("LT"),JSON.stringify(detailInterface)]
			postSheet ("1gRaSO_HxlecOxtjPhF56VY9QRQSAKZdjLsZpo4UC7zc",arr) 
	 	}else {
	 		detailInterface.push(data_)
	 	}	  
	}
 //***************** Function post_device ********************
 function post_device (data_) {		
 	let count = detail.length
 	if (count == 5) {
 		console.log('*******POST to_device #',count,'Success!!!!********')
 		detail.push(data_)
 		let arr = [moment().format("L"), moment().format("LT"),JSON.stringify(detail)]
		postSheet ("1Q6az-EGPMD-bKYa80NcOTIhAO9Jr2JFlYR9VxIZmB7Y",arr) 
		
 	}else {
 		detail.push(data_)
 	}	  
 }

 //***************** Function Post ********************
function postSheet (idSheet,datas) {
	axios.defaults.headers.post['Content-Type'] = 'application/json';
	axios({
	  method: 'post',
	  url: 'https://apisheet.herokuapp.com/',
	  data: JSON.stringify({
	    "KeyID": idSheet,
	    "column": "sheet1!A:C", 
	    "valuesData": datas
	  })
	}).then(function(response) {   
	    if (response.data != 'OK') {
	    	getR124()
	    }else{
	    	console.log('Post Success!!!!!!!!!')
	    }    
	})
}

function bytesToSize(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
   if (bytes == 0) return '0 Byte'
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
}
function convert (byte) {
   var sizes = ['Bytes', 'Kbps', 'Mbps', 'Gbps', 'Tbps']
   byte = byte * 8
   if (byte == 0) return '0 Byte'
   var i = parseFloat(Math.floor(Math.log(byte) / Math.log(1000))) 
   return parseFloat(byte / Math.pow(1000, i), 2).toFixed(2) + ' ' + sizes[i]
}

app.listen(app.get('port'), function () {
  console.log('run at port', app.get('port'))
})