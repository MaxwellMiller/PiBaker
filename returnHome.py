
import RPi.GPIO as GPIO

def returnHome(motors):
	returnHomeX(motors)
	returnHomeY(motors)
	returnHomeZ(motors)


def returnHomeX(motors):
	import configVars as Vars
	GPIO.setmode(GPIO.BCM)

	GPIO.setup(Vars.xStopper, GPIO.IN)
	GPIO.setup(motors[0].DIR, GPIO.OUT)
	GPIO.setup(motors[0].STEP, GPIO.OUT)

	while GPIO.input(Vars.xStopper)  == 1:
#		print "switch equals  1"
		motors[0].move(-0.1, 0,0.3*min(Vars.xMaxFeedrate, Vars.feedrate)) 	# moving 1mm at a time c-clockwise until we hit switch 
	
	print "Endstop triggered"
	
	while  GPIO.input(Vars.xStopper) != 1:
		motors[0].move(0.1, 0,0.1*min(Vars.xMaxFeedrate, Vars.feedrate))
		
	print("zeroed out : ", motors[0].ID)

def returnHomeY(motors):
	import configVars as Vars
	GPIO.setmode(GPIO.BCM)

	GPIO.setup(Vars.yStopper, GPIO.IN)
	GPIO.setup(motors[1].DIR, GPIO.OUT)
	GPIO.setup(motors[1].STEP, GPIO.OUT)

	while GPIO.input(Vars.yStopper)  == 1:
#		print "switch equals  1"
		motors[1].move(-0.1, 0,0.3*min(Vars.yMaxFeedrate, Vars.feedrate)) 	# moving 1mm at a time c-clockwise until we hit switch 
	
	print "Endstop triggered"
	
	while  GPIO.input(Vars.yStopper) != 1:
		motors[1].move(0.1, 0,0.1*min(Vars.yMaxFeedrate, Vars.feedrate))
		
	print("zeroed out : ", motors[1].ID)

def returnHomeZ(motors):
	import configVars as Vars
	GPIO.setmode(GPIO.BCM)

	GPIO.setup(Vars.zStopper, GPIO.IN)
	GPIO.setup(motors[2].DIR, GPIO.OUT)
	GPIO.setup(motors[2].STEP, GPIO.OUT)

	while GPIO.input(Vars.zStopper)  == 1:
#		print "switch equals  1"
		motors[2].move(-0.1, 0,min(Vars.zMaxFeedrate, Vars.feedrate)) 	# moving 1mm at a time c-clockwise until we hit switch 
	
	print "Endstop triggered"
	
	while  GPIO.input(Vars.zStopper) != 1:
		motors[2].move(0.1, 0,min(Vars.zMaxFeedrate, Vars.feedrate))
		
	print("zeroed out : ", motors[2].ID)
