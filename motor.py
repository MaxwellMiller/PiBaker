_author_ = 'William'

import RPi.GPIO as GPIO
import configVars as Vars
from time import sleep
# GPIO.setmode(GPIO.BCM)

default = 16

class motor(object):

	def __init__(self, name, direction, step, maxfeedrate, stepspermm, micro=default):
		self.ID = name  # identify is this Motor X, Y, Z, E?
		self.DIR = direction
		self.STEP = step
		self.pos = 0  #upon creation we assume the printhead is home
		self.maxfeedrate = maxfeedrate
		self.steps = stepspermm
		self.microstep = micro

	def get_DIR(self):
		return self.DIR

	def get_STEP(self):
		return self.STEP

	def get_ID(self):
		return self.ID

	def move(self,param, myPosition, fr=Vars.feedrate):
		# param comes in as mm, as does myPosition
	
	
		GPIO.setmode(GPIO.BCM)
				
		GPIO.setup(self.DIR, GPIO.OUT)
		GPIO.setup(self.STEP, GPIO.OUT)
				
		# Depending on last position of the head, our direction may change on the coord plane
		DIR = 1  # assuming clockwise
		
		print("About to Move", self.ID, param)
		param = param - myPosition
		
		if(param < 0.0):
			DIR = 0
			param = param*-1
				
		end = param * self.steps # param (mm) to steps - 1/16th step
		
		sleepTime = 1 / (self.microstep*self.steps*Vars.feedrate/60) 
		
		steps = 0.0
		
		# print("Attempting to STEP and DIR ", self.STEP, self.DIR)
		# print("Starting", self.ID)
		try:
			while steps <= end:
				
				GPIO.output(self.DIR, DIR)	 # A4988 Stepper Driver DIR
				
				GPIO.output(self.STEP, 1)
				sleep(sleepTime) 			 # an artistic choice for now
				steps = steps + 0.5
				GPIO.output(self.STEP, 0)
				sleep(sleepTime)
				steps = steps + 0.5
		finally:
			#dont do this, breaks temperature readings 
			# GPIO.cleanup()		 # clear pulses from pins
			
			#post-mortem of motor moves
			'''print("read in parameter[mm] of ", param)
			#print("Our step goal: ", end)
			#print("We Stepped ", steps)
			# print("Traveled [mm]: ", traveled)'''
			# print("Finished! ", self.ID, "steps moved: ", steps)

	
