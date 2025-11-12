#include <Arduino.h>
#include "AD5593R.h"
#include <Wire.h>

#define m3_pd A6            // Module 3 Photo Diode

#define dac_pd_pair2 4      // Pair 2 photo diode LED

#define dac_0v 0        // DAC value to set 0V
#define dac_1p8v 1150   // DAC value to set 1.8V
#define dac_3p3v 2000   // DAC value to sett 3.3V

#define adc_conversion 0.00322
#define dac_conversion 0.00165

#define DELAY 20
long start;
long now;
long elapsed;
long last;


void setup() {
  Wire.begin();
  Serial.begin(115200);
  dac_setup();
  reset_dac();
  start=millis();
  last=0;
}

void loop() {
  int interval=10;
  
  now=millis();
  elapsed=now-start;
  
  if ((elapsed-last)>interval){
    if (Serial.available()) {
      String received = Serial.readStringUntil('\n');
      setDACVal(dac_pd_pair2, received.toInt());
      Serial.println("ACK");
    }
    last=elapsed;
  }
}

void dac_setup(){
  initADAC(0x10, 1, 1);
  setDACGain(1);
  setDACpin(dac_pd_pair2);
}

void reset_dac(){
  setDACVal(dac_pd_pair2,0);
}
