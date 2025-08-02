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

#define PERIOD 3
#define THRESHOLD 200

#define ref_voltage 3.3

MAX86916_eda ppg;

enum Command {
  M1_NETWORK_ARRAY,
  M1_VOLTAGE_DIVIDER,
  M2_DIODE_MODULE,
  M2_DIODE_RAW,
  M2_TRAN_MODULE,
  M2_TRAN_RAW,
  M3_LED_FLASH,
  M3_PPG,
  LIFI_TX,
  LIFI_RX,
  UNKNOWN_COMMAND,
  EXIT_COMMAND
};

void setup() {
  Wire.begin();
  Serial.begin(115200);
  dac_setup();
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n'); // Read the incoming command

    Command cmd = mapStringToCommand(command);

    // Switch-case structure to handle different commands
    switch (cmd) {
      case M1_NETWORK_ARRAY:
        m1_network_array();
        break;
      case M1_VOLTAGE_DIVIDER:
        m1_voltagedivider();
        break;
      case M2_DIODE_MODULE:
        m2_diode_module();
        break;
      case M2_DIODE_RAW:
        m2_diode_module_raw();
        break;
      case M2_TRAN_MODULE:
        m2_tran_module();
        break;
      case M2_TRAN_RAW:
        m2_tran_module_raw();
        break;
      case M3_LED_FLASH:
        m3_led_flash();
        break;
      case M3_PPG:
        m3_ppg();
        break;
      case LIFI_TX:
        lifi_tx();
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
  if (command == "m1na") return M1_NETWORK_ARRAY;
  if (command == "m1vd") return M1_VOLTAGE_DIVIDER;
  if (command == "m2d") return M2_DIODE_MODULE;
  if (command == "m2draw") return M2_DIODE_RAW;
  if (command == "m2tran") return M2_TRAN_MODULE;
  if (command == "m2tranraw") return M2_TRAN_RAW;
  if (command == "m3led") return M3_LED_FLASH;
  if (command == "m3ppg") return M3_PPG;
  if (command == "lifi_tx") return LIFI_TX;
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

void m1_network_array(){
  Serial.println("Make sure that module 1 is active");
  while(1){
    int analog_value = analogRead(m1_na);
    if(analog_value > 1000 && analog_value < 1020) Serial.println("S1 (3.3V)");
    else if (analog_value > 590 && analog_value < 615)Serial.println("S2 (1.95V)");
    else if (analog_value > 360 && analog_value < 375)Serial.println("S3 (1.18V)");
    else if (analog_value > 755 && analog_value < 775)Serial.println("S4 (2.50V)");
    else if (analog_value > 500 && analog_value < 520)Serial.println("S5 (1.65V)");
    else if (analog_value > 240 && analog_value < 260)Serial.println("S6 (0.804V)");
    else if (analog_value > 635 && analog_value < 660)Serial.println("S7 (2.12V)");
    else if (analog_value > 400 && analog_value < 425)Serial.println("S8 (1.35V)");
    else if (analog_value > 0 && analog_value < 200)Serial.println("S9 (0V)");

    if(exit_condition()) break;

    delay(20);
  }
}

void m1_voltagedivider(){
  Serial.println("Make sure that module 1 is active");
  while(1){
    Serial.print((analogRead(m1_vd)/1023.0)*ref_voltage);
    Serial.println("V");
    if(exit_condition()) break;
  }
}

void m2_diode_module(){
  Serial.println("Make sure that module 2 is active");
  int inc_interval = 10;
  int inc_delay = 1;
  int inc = 0;
  unsigned long prev_inc_time = 0;

  Serial.println("Diode current in (mA), Voltage applied across diode in (V)");
  while(1){
    if((inc <= dac_3p3v) && (millis() - prev_inc_time > inc_delay)){
      prev_inc_time = millis();
      setDACVal(dac_diode, inc);
      Serial.print((analogRead(m2_diode)*adc_conversion));
      Serial.print(",");
      float diode_voltage = inc*0.00165;
      Serial.println(diode_voltage, 6);
      inc = inc + inc_interval;
    }
    if((inc >= dac_3p3v) && (millis() - prev_inc_time > inc_delay)){
       prev_inc_time = millis();
       setDACVal(dac_diode, 0);
       inc = 0;
       Serial.println("Ready to enter next command");
       break;
    }
  }
}

void m2_diode_module_raw(){
  Serial.println("Make sure that module 2 is active");
  int inc_interval = 10;
  int inc_delay = 1;
  int inc = 0;
  unsigned long prev_inc_time = 0;

  Serial.println("Current in mA");
  while(1){
    if((inc <= dac_3p3v) && (millis() - prev_inc_time > inc_delay)){
      prev_inc_time = millis();
      setDACVal(dac_diode, inc);
      Serial.println(analogRead(m2_diode)*adc_conversion);
      inc = inc + inc_interval;
    }
    if((inc >= dac_3p3v) && (millis() - prev_inc_time > inc_delay)){
       prev_inc_time = millis();
       setDACVal(dac_diode, 0);
       inc = 0;
       Serial.println("Ready to enter next command");
       break;
    }
  }
}

void m2_tran_module(){
  Serial.println("Make sure that module 2 is active");
  while(1){
    for(int k = 0; k < 2000; k = k + 200){
      setDACVal(dac_nmos_gate, k);
      Serial.print("Gate voltage Vgs = ");
      Serial.print(k*dac_conversion);
      Serial.println(" V");
      Serial.println("Vds (V), Drain current (A)");
      for(int i = 0; i < 2000; i = i + 10){
        setDACVal(dac_nmos_drain, i);
        Serial.print(i*dac_conversion);
        Serial.print(", ");
        Serial.println(analogRead(m2_nmos)*adc_conversion);
        delay(5);
      }
    }
    Serial.println("Ready to enter next command");
    break;
  }
}

void m2_tran_module_raw(){
  Serial.println("Make sure that module 2 is active");
  while(1){
    for(int k = 0; k < 2000; k = k + 200){
      setDACVal(dac_nmos_gate, k);
      Serial.print("Gate voltage Vgs = ");
      Serial.print(k*dac_conversion);
      Serial.println(" V");
      for(int i = 0; i < 2000; i = i + 10){
        setDACVal(dac_nmos_drain, i);
        Serial.println(analogRead(m2_nmos)*adc_conversion);
        delay(5);
      }
    }
    Serial.println("Ready to enter next command");
    break;
  }
}

void m3_led_flash(){
    Serial.println("Make sure that module 3 is active");
    int time_period = 100;
    int previous_state = 0;

    unsigned long previous_toggle_time = 0;


    while(1){
      Serial.println(analogRead(m3_pd));
      if(millis() - previous_toggle_time >= time_period/2){
        previous_toggle_time = millis();
        if(previous_state == 0){
          setDACVal(dac_pd_pair1, 2250);
          previous_state = 1;
        }
        else{
          setDACVal(dac_pd_pair1, 0);
          previous_state = 0;
        }
      }
      if(exit_condition()) break;
    }
}

void m3_ppg(){
//  Serial.println("Make sure that module 3 is active");

  int16_t blue; 
  int16_t green; 
  int16_t IR; 
  int16_t red;
  
  int16_t IR_blue; 
  int16_t IR_red;
  int16_t IR_green;

  ppg.begin();
  ppg.setup();
  ppg.setPulseAmplitudeRed(0x7F);
  ppg.setPulseAmplitudeIR(0x7F);
  ppg.setPulseAmplitudeGreen(0x7F);
  ppg.setPulseAmplitudeBlue(0x7F);

  
  while(1){
    Serial.print(ppg.getIR());  // Red
    Serial.print(",");
    Serial.println(ppg.getRed()); // IR
    if(exit_condition()) break;
  }
//  if(select == 0){
//    while(1){
//      Serial.println(ppg.getIR()); // Red
//      if(exit_condition()) break;
//    }
//  } 
//  else if(select == 1){
//    while(1){
//      Serial.println(ppg.getRed()); // IR
//      if(exit_condition()) break;
//    }
//  }
}

bool read_pd(){
  int pd_value = analogRead(m3_pd);
  return pd_value > THRESHOLD ? true : false;
}

void lifi_tx(){
  char* string = "This is a test transmission! ";
  int string_length;
  string_length = strlen(string);
  
  while(1){
    for(int i = 0; i < string_length; i ++)
    {
      send_byte(string[i]);
    }
    delay(1000);
    if(exit_condition()) break;
  }
}

void send_byte(char my_byte){
  setDACVal(dac_pd_pair2, 0);
  delay(PERIOD);

  //transmission of bits
  for(int i = 0; i < 8; i++)
  {
    if((my_byte&(0x01 << i))!=0) setDACVal(dac_pd_pair2, 2250);
    else setDACVal(dac_pd_pair2, 0);
    delay(PERIOD);
  }

  setDACVal(dac_pd_pair2, 2250);
  delay(PERIOD);
}

void lifi_rx(){
  Serial.println("Make sure that module 3 is active");
  bool previous_state;
  bool current_state;
  
  while(1){
    current_state = read_pd();
    if(!current_state && previous_state)
    {
      print_byte(get_byte());
    }
    previous_state = current_state;
    if(exit_condition()) break;
  }
}

char get_byte(){
  char ret = 0;
  delay(PERIOD*1.5);
  for(int i = 0; i < 8; i++)
  {
   ret = ret | read_pd() << i; 
   delay(PERIOD);
  }
  return ret;
}

void print_byte(char my_byte){
  char buff[2];
  sprintf(buff, "%c", my_byte);
  Serial.print(buff);
}
