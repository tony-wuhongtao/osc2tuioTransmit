# node.js OSC to TUIO transmit

A simple transmit that receive OSC(port 4444) then Transmit to TUIO style touch events to a listener on port 3333 of _localhost_.

We have a simulator OSC send programe created by TouchDesigner.



Usage:

1. _git clone https://github.com/tony-wuhongtao/osc2tuioTransmit_
2. _npm install_
3. _node transmit.js **receivedPort** **sendPort** **lifeSpan** **interval**_
4. _Alternative start way: npm start -- **receivedPort** **sendPort** **lifeSpan** **interval**_


default [receivedPort=4444] [sendPort=3333] [lifeSpan=10] [interval=100]
Untill get new points, the points lifetime = lifeSpan*interval (sm)

## OSC self-define protocol
/tuiomw/v1 id1,x1,y1,id2,x2,y2......
