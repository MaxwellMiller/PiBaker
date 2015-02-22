# Note: Will need the Python Module PLY from http://www.dabeaz.com/ply/ to run correctly

# import RPi.GPIO as GPIO
# import tokenize
import ply.lex as lex
# set up BCM GPIO numbering
# GPIO.setmode(GPIO.BCM)

'''
if GPIO.RPI_REVISION == 3:
    print("You have the Model B+ :)")

else:
    GPIO.cleanup()
'''

# Above is specific raspbian library python code

tokens = (
    # MISC
    "COMMENT",  # ;
    "NUMBER",
    "LETTER",
    "newline",

    "MOVE",                     # G0-G1
    "DWELL",                    # G4
    "MOVE_TO_ORIGIN",           # G28
    "SET_POSITION",             # G92
    "SET_INACTIVITY_SHUTDOWN",  # M85
    "SET_AXIS_STEPS",           # M92
    "SET_TEMP",                 # M104
    "FAN_ON",                   # M106
    "SET_TEMP_WAIT",            # M109
    "BED_TEMP",                 # M140
    "WAIT_4_BED_TEMP",          # M190
    "SET_FILAMENT_DIA",         # M200
    "SET_MAX",                  # M201/202/203
    "SET_DEFAULT_ACCEL",        # M204
    "ADV_SETTINGS",             # M205
    "SET_HOME_OFFSET",          # M206
    "SET_RETRACT_LEN",          # M207
    "SET_RECOV_OF_UNRETRACT",   # M208
    "ENABLE_AUTO_RETRACT",      # M209
    "SET_SPEED_OVERRIDE",       # M220
    "SET_EXTRUDE_OVERRIDE",     # M221

)

# ;
def t_COMMENT(t):
    r'\;.*'
    # print t # remove this print to clear console, these don't make it to the token list
    return t
    # comments discarded but currently printed


# G1/G0
def t_MOVE(t):
    r'G[0|1]'
    return t

# G4
def t_DWELL(t):
    r'G4'
    return t

# G28
def t_MOVE_TO_ORIGIN(t):
    r'G28'
    return t

# G92
def t_SET_POSITION(t):
    r'G92'
    return t


# Specific M Commands
# M85
def t_SET_INACTIVITY_SHUTDOWN(t):
    r'M85'
    return t

def t_SET_AXIS_STEPS(t):
    r'M92'
    return t

def t_SET_TEMP(t):
    r'M104'
    return t

# M106
def t_FAN_ON(t):
    r'M106'
    return t

# M109
def t_SET_TEMP_WAIT(t):
    r'M109'
    return t

# M140
def t_BED_TEMP(t):
    r'M140'
    return t

def t_WAIT_4_BED_TEMP(t):
    r'M190'
    return t

def t_SET_FILAMENT_DIA(t):
    r'M200'
    return t

# M201/M202/M203
def t_SET_MAX(t):
    r'M20[1|2|3]'
    return t

# M204
def t_SET_DEFAULT_ACCEL(t):
    r'M204'
    return t

# M205
def t_ADV_SETTINGS(t):
    r'M205'
    return t

# M206
def t_SET_HOME_OFFSET(t):
    r'M206'
    return t

# M207
def t_SET_RETRACT_LEN(t):
    r'M207'
    return t

# M208
def t_SET_RECOV_OF_UNRETRACT(t):
    r'M208'
    return t

# M209
def t_ENABLE_AUTO_RETRACT(t):
    r'M209'
    return t

# M220
def t_SET_SPEED_OVERRIDE(t):
    r'M220'
    return t

# M221
def t_SET_EXTRUDE_OVERRIDE(t):
    r'M221'
    return t

# LETTER AND NUMBER MUST BE TOKENED LAST
def t_NUMBER(t):
    r'[-|.|0-9*]+'
    t.value = float(t.value)
    return t

def t_LETTER(t):
    r'\w'
    return t



# Define a rule so we can track line numbers
def t_newline(t):
    r'\n+'
    t.lexer.lineno += len(t.value)

# A string containing ignored characters (spaces and tabs)
t_ignore  = ' \t'

# Error handling rule
def t_error(t):
    print "Illegal character '%s'" % t.value[0]
    t.lexer.skip(1)

# setting up lex and reading in the G Code
lexer = lex.lex()
'''f = open('lexTest.g', 'r')
for line in f:
    s = line
    lex.input(s)
    for tok in lexer:
        print tok
'''
# parsing rules

#def p_gLine_gCommand(p):
#    'gLine : gCommand'

def p_gLine_gCommand(p): #double gCommands catch comments
    '''gLine : gCommand
             | gCommand gCommand
             | '''

def p_gCommand_gWord(p):
    '''gCommand : gWord
                | gWord LETTER NUMBER
                | gWord LETTER NUMBER LETTER NUMBER
                | gWord LETTER NUMBER LETTER NUMBER LETTER NUMBER
                | gWord LETTER NUMBER LETTER NUMBER LETTER NUMBER LETTER NUMBER
                | gWord LETTER NUMBER LETTER NUMBER LETTER NUMBER LETTER NUMBER LETTER NUMBER
                | gWord LETTER NUMBER LETTER NUMBER LETTER NUMBER LETTER NUMBER LETTER NUMBER LETTER NUMBER
                | gWord COMMENT
                | COMMENT'''

    if (p[1] == 'G1') | (p[1] == 'G0'):
        if len(p) == 6:
            print("G1 - MOVE ", p[2], p[3], p[4], p[5])
        if len(p) == 8:
            print("G1 - MOVE ", p[2], p[3], p[4], p[5], p[6], p[7])
        if len(p) == 10:
            print("G1 - MOVE ", p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9])
        if len(p) == 12:
            print("G1 - MOVE ", p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11])
        if len(p) == 14:
            print("G1 - MOVE ", p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11],
                  p[12], p[13])

    if p[1] == 'G4':
        if p[2] == 'P':
            print("G4 - DWELL - Milliseconds: ",  p[3])
        if p[2] == 'S':
            print ("G4 - DWELL - Seconds: ", p[3])

    if p[1] == 'G28':
        print("G28- MOVE TO ORIGIN, capture doesnt matter for RepRep")

    if p[1] == 'G92':
        # A G92 without coordinates will reset all axes to zero.
        if len(p) == 2:
            print("G92 -SET POSITION, no params everything to 0")
        if len(p) == 4:
            print("G92 -SET POSITION, one gWord param", p[2], p[3])
        if len(p) == 6:
            print("G92 -SET POSITION, 2 gWord param", p[2], p[3], p[4], p[5])
        if len(p) == 8:
            print("G92 -SET POSITION, 3 gWord param", p[2], p[3], p[4], p[5], p[6], p[7])

    if p[1] == 'M85':
        if p[2] == 'P':
            print("M85 - Set Inactive Shutdown - Milliseconds: ",  p[3])
        if p[2] == 'S':
            print ("M85 - Set Inactive Shutdown  - Seconds: ", p[3])

    if p[1] == 'M92':
        print("M92 - Set Axis Steps of X:", p[3])

    if p[1] == 'M104':
        print("M104 Set Temp to: ", p[3])

    if p[1] == 'M106':
        print("M106 FAN ON to: ", p[3])

    if p[1] == 'M109':
        print("M109 set temp to : ", p[3], " and WAIT")

    if p[1] == 'M140':
        if len(p) == 4:
            print("M140 Bed Temp to : ", p[3])
        if len(p) == 6:
            print("M140 Bed Temp to : ", p[3]," and R:", p[5])

    if p[1] == 'M190':
        print("M190 Waiting for Bed Temp of: ", p[3])

    if p[1] == 'M200':
        print("M200 Set Filament Diameter to ", p[3])

    # TODO parse out to the 3 specific commands but they are current;y all captured
    if (p[1] == "M201") | (p[1] == "M202") | (p[1] == "M203"):
        if len(p) == 4:
            print("Max Set for ", p[2], p[3])
        if len(p) == 6:
            print("Max Set for ", p[2], p[3], p[4], p[5])
        if len(p) == 8:
            print("Max Set for ", p[2], p[3], p[4], p[5], p[6], p[7])
        if len(p) == 10:
            print("Max Set for ", p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9])

    if p[1] == 'M204':
        if len(p) == 4:
            print("Set Default Accel: ", p[2], p[3])
        if len(p) == 6:
            print("Set Default Accel: ", p[2], p[3], p[4], p[5])

    if p[1] == 'M205':
        print("ADV Settings -- more research required")

    if p[1] == 'M206':
        print("Set Home OFFset to: ", p[3], p[5], p[7])

    if p[1] == 'M207':
        if len(p) == 4:
            print("Set Retract Length for: ", p[2], p[3])
        if len(p) == 6:
            print("Set Retract Length for:  ", p[2], p[3], p[4], p[5])
        if len(p) == 8:
            print("Set Retract Length for: ", p[2], p[3], p[4], p[5], p[6], p[7])
        if len(p) == 10:
            print("Set Retract Length for: ", p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9])

    if p[1] == 'M208':
        if len(p) == 4:
            print("Set Recover Length for: ", p[2], p[3])
        if len(p) == 6:
            print("Set Recover Length for:  ", p[2], p[3], p[4], p[5])

    if p[1] == 'M209':
        print("Auto Retract Status: ", p[3])

    if p[1] == 'M220':
        print("Speed Override Percentage: ", p[3])

    if p[1] == 'M221':
        print("Set Extrude Override Percentage: ", p[3])

def p_gWord_LetNum(p):
    '''gWord : MOVE
             | DWELL
             | MOVE_TO_ORIGIN
             | SET_POSITION
             | SET_INACTIVITY_SHUTDOWN
             | SET_AXIS_STEPS
             | SET_TEMP
             | FAN_ON
             | SET_TEMP_WAIT
             | BED_TEMP
             | WAIT_4_BED_TEMP
             | SET_FILAMENT_DIA
             | SET_MAX
             | SET_DEFAULT_ACCEL
             | ADV_SETTINGS
             | SET_HOME_OFFSET
             | SET_RETRACT_LEN
             | SET_RECOV_OF_UNRETRACT
             | ENABLE_AUTO_RETRACT
             | SET_SPEED_OVERRIDE
             | SET_EXTRUDE_OVERRIDE
             | LETTER NUMBER'''

    # print("Found gWord!", p[1], p[2])
    # Defining G1 - Move
    if p[1] == 'G1':
        p[0] = p[1]

    if p[1] == 'G4':
        p[0] = p[1]

    if p[1] == 'G28':
        p[0] = p[1]

    if p[1] == 'G92':
        p[0] = p[1]

    if p[1] == 'M85':
        p[0] = p[1]

    if p[1] == 'M92':
        p[0] = p[1]

    if p[1] == 'M104':
        p[0] = p[1]

    if p[1] == 'M106':
        p[0] = p[1]

    if p[1] == 'M109':
        p[0] = p[1]

    if p[1] == 'M140':
        p[0] = p[1]

    if p[1] == 'M190':
        p[0] = p[1]

    if p[1] == 'M200':
        p[0] = p[1]

    if p[1] == 'M201':
        p[0] = p[1]

    if p[1] == 'M202':
        p[0] = p[1]

    if p[1] == 'M203':
        p[0] = p[1]

    if p[1] == 'M204':
        p[0] = p[1]

    if p[1] == 'M205':
        p[0] = p[1]

    if p[1] == 'M206':
        p[0] = p[1]

    if p[1] == 'M207':
        p[0] = p[1]

    if p[1] == 'M208':
        p[0] = p[1]

    if p[1] == 'M209':
        p[0] = p[1]

    if p[1] == 'M220':
        p[0] = p[1]

    if p[1] == 'M221':
        p[0] = p[1]

    # Single G-Word Commands
    if p[1] == 'G':
        if p[2] == 21:
            print("This is set to Millimeters")
        if p[2] == 29:
            print("Detailed Z Probe")
        if p[2] == 90:
            print("Absolute Positioning")

    if p[1] == 'M':
        if p[2] == (0|1):
            print("SLEEP/STOP")
        if p[2] == 17:
            print("Power All Motors")
        if p[2] == 18:
            print("Disable All Motors")
        if p[2] == 82:
            print("Extruder Absolute Mode!")
        if p[2] == 84:
            print("Disable All Motors Variant")
        if p[2] == 105:
            print("Get Temp")
        if p[2] == 107:
            print("FAN OFF")
        if p[2] == 112:
            print("Emergency Stop")
        if p[2] == 115:
            print("Request Firmware")
        if p[2] == 119:
            print("Get Endstop States")
        if p[2] == 302:
            print("Allow Cold Extrudes")
        if p[2] == 400:
            print("Finish all Moves")
        if p[2] == 500:
            print("Store Params EEPROM")
        if p[2] == 501:
            print("Read Params EEPROM")
        if p[2] == 503:
            print("Print out curr Settings from EEPROM")

def p_error(t):
    print("Syntax error at '%s'" % t.value)


import ply.yacc as yacc
parser = yacc.yacc()

'''f = open('lexTest.g', 'r')
for lin in f:
    s1= lin
    lex.input(s1)
    for tok in lexer:
        print tok'''

import sys

f = open('sys.argv', 'r')

for line in f:
    s = line
    # print(s)
    parser.parse(s)
