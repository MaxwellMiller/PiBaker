import RPi.GPIO as GPIO
import configVars as Vars

GPIO.setmode(GPIO.BCM)
GPIO.setup(Vars.xStopper, GPIO.IN)
GPIO.setup(Vars.yStopper, GPIO.IN)
GPIO.setup(Vars.zStopper, GPIO.IN)


print GPIO.input(Vars.xStopper)
print GPIO.input(Vars.yStopper)
print GPIO.input(Vars.zStopper)

GPIO.cleanup()
