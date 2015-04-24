

__author__ = 'William'

import RPi.GPIO as GPIO
from time import sleep
GPIO.setmode(GPIO.BCM)

from printHead import PrintHead

milimeterMode = True

dummySTEP = 20
dummyDIR = 21

xSTEP = 17
xDIR = 27

ySTEP = 22 
yDIR = 5

zSTEP = 6 
zDIR = 13

eSTEP = 19 
eDIR = 26

xStopper = 18 
yStopper = 23
zStopper = 24

#number of steps per mm (calibration)
xSteps = 109.34
ySteps = 114.68
zSteps = 1986.18
eSteps = 101.23

filamentDiameter = 0.0

#in mm/s
feedrate = 100.0

#these are in mm/s
xMaxFeedrate = 100.0
yMaxFeedrate = 100.0
zMaxFeedrate = 100.0
eMaxFeedrate = 100.0

targetTemp = 0
curTemp = 0

fanRate = 0.0


