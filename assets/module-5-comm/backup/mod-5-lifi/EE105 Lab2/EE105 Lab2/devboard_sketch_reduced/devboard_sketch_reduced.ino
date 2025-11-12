#include <Arduino.h>
#include "AD5593R.h"
#include <Wire.h>
#include "MAX86916_eda.h"

#define m1_na A0      // Module 1 Network Array
#define m1_vd A1      // Module 1 Voltage Divider
#define m2_diode A2   // Module 2 Diode
#define m2_nmos A3    // Module 2 NMOS
#define m3_pd A6      // Module 3 Photo Diode
#define module_selector A7  // Module selector

#define dac_diode 0         // DAC diode
#define dac_nmos_gate 1     // NMOS Gate
#define dac_nmos_drain 2    // NMOS Drain
#define dac_pd_pair1 3      // Pair 1 photo diode LED
#define dac_pd_pair2 4      // Pair 2 photo diode LED


#define dac_0v 0        // DAC value to set 0V
#define dac_1p8v 1150   // DAC value to set 1.8V
#define dac_3p3v 2000   // DAC value to sett 3.3V

#define adc_conversion 0.00322
#define dac_conversion 0.00165

#define PERIOD 10
#define THRESHOLD 200

#define ref_voltage 3.3

MAX86916_eda ppg;

enum Command {
  LIFI_TX,
  SIN_TX,
  LIFI_RX,
  EXIT_COMMAND,
  UNKNOWN_COMMAND
};

int range[]={1636,1939}; //2.7V to 3.2V
float T=3;


float get_desired_vled_raw(
                   long elapsed               // time elapsed since start, in ms
                   ) { // return the desired raw DAC value given the time elapsed. It's an absolute value from 0 to 2000.    
    //FIXME
  float vled_raw = 0;
  float t_mod=fmod(elapsed/1000.0,T);
  vled_raw=range[0]+(range[1]-range[0])*t_mod/(T);
  return vled_raw; //in deg
}

float get_desired_vled_sin(
                   long elapsed,               // time elapsed since start, in ms
                   float frequency) { // return the desired raw DAC value given the time elapsed. It's an absolute value from 0 to 2000.    
    //FIXME
  float t_mod=fmod(elapsed/1000.0,T);
  
  int vled_raw=145 * sin(2*3.14*(t_mod/T)*frequency) + 1750;
  return vled_raw; //in deg
}


long start;
long now;
long elapsed;
long last;

void setup() {
  Wire.begin();
  Serial.begin(115200);
  dac_setup();
  reset_dac();
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n'); // Read the incoming command

    Command cmd = mapStringToCommand(command);

    // Switch-case structure to handle different commands
    switch (cmd) {
      case LIFI_TX:
        lifi_tx();
        break;
      case SIN_TX:
        sin_tx();
        break;
      case LIFI_RX:
        lifi_rx();
        break;
      case EXIT_COMMAND:
        break;
      default:
        Serial.println("Unknown command");
        break;
    }
  }
}

Command mapStringToCommand(String command) {
  if (command == "lifi_tx") return LIFI_TX;
  if (command == "sin_tx") return SIN_TX;
  if (command == "lifi_rx") return LIFI_RX;
  if (command == "exit" || command == "e") return EXIT_COMMAND;
  return UNKNOWN_COMMAND;
}

bool exit_condition(){
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    if (command == "exit" || command == "e") {
      reset_dac();
      Serial.println("Ready to enter next command");
      return true;
    }
  }
  return false;
}

void dac_setup(){
  initADAC(0x10, 1, 1);
  setDACGain(1);
  setDACpin(dac_diode);
  setDACpin(dac_nmos_gate);
  setDACpin(dac_nmos_drain);
  setDACpin(dac_pd_pair1);
  setDACpin(dac_pd_pair2);
}

void reset_dac(){
  setDACVal(dac_diode,0);
  setDACVal(dac_nmos_gate,0);
  setDACVal(dac_nmos_drain,0);
  setDACVal(dac_pd_pair1,0);
  setDACVal(dac_pd_pair2,0);
}

void lifi_tx(){
    Serial.println("Starting LiFi Transmission with Step Light Modulation");
    
    start = millis();
    last=0;
    while(1){
        now=millis();
        elapsed=now-start;
        int tx_interval=50; //ms
        
        if (elapsed-last>tx_interval){
          int led_brightness=get_desired_vled_raw(elapsed);
          setDACVal(dac_pd_pair2, led_brightness);
          Serial.println(led_brightness);
          last=elapsed;
        }
        if(exit_condition() or elapsed>20000) break;
    }
    
    setDACVal(dac_pd_pair2, 0);
    Serial.println("LiFi Transmission Complete");
}

void sin_tx(){
    Serial.println("Starting LiFi Transmission with Step Light Modulation");
    
    start = millis();
    last=0;
    while(1){
        now=millis();
        elapsed=now-start;
        int tx_interval=50; //ms
        float tx_sin_f=1.0;
        if (elapsed-last>tx_interval){
          int led_brightness=get_desired_vled_sin(elapsed,tx_sin_f);
          setDACVal(dac_pd_pair2, led_brightness);
          Serial.println(led_brightness);
          last=elapsed;
        }
        if(exit_condition() or elapsed>20000) break;
    }
    
    setDACVal(dac_pd_pair2, 0);
    Serial.println("LiFi Transmission Complete");
}

void lifi_rx(){
  Serial.println("Starting LiFi reception for LED intensity data");
  
  start = millis();
  last=0;
    
  while(1){
     now=millis();
     elapsed=now-start;
     int rx_interval=5  ; //ms
     if (elapsed-last>rx_interval){ 
        int raw_pd = analogRead(m3_pd);         // Read the raw ADC value from the photodiode
        float pd_current = raw_pd * adc_conversion;  // Convert to voltage (or relevant unit)
        Serial.println(pd_current, 4);  // Print with 4 decimal places
        last=elapsed;
     }
     
    if(exit_condition() or elapsed>30000) break;
  }
  Serial.println("LED intensity reception complete");
}
