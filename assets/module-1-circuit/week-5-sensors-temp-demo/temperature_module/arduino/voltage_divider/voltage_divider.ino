#include <Arduino.h>

#define m1_vd_input  // 1. change here, m1_vd_input ? which ADC is connected to your voltage divider
#define adc_resolution 1024

bool readingEnabled = false;
int counter = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial); // Wait for the serial port to be ready (for certain boards like Leonardo)
}

void loop() {
  // Check if any serial input is available
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n'); // Read the command from the serial monitor
    
    // Check if the entered command is 'readvoltage'
    if (command == "readvoltage") readingEnabled = true;
  }

  while(readingEnabled){
    Serial.println(analogRead(m1_vd_input));
    counter = counter + 1;
    if(counter == ?){ // 2. change here, counter == ? for getting 10s
      counter = 0;
      readingEnabled = false;
      Serial.println("Ready to enter next command");
      break;
    }
    delay(1);
  }
}
