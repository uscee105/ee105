
#include <Wire.h>
#include "MAX86916_eda.h"    //for reflectance mode_sensor1

MAX86916_eda particleSensor_ppg_eda; 

#define debug Serial 


int16_t blue; 
int16_t green; 
int16_t IR; 
int16_t red;

int16_t IR_blue; 
int16_t IR_red;
int16_t IR_green;

 

void setup()
{
  
  debug.begin(115200);
  debug.println("max86916_s Basic Readings Example");

  Serial.begin(115200); 

  if (particleSensor_ppg_eda.begin() == false)       //I have commented the part id section in .h file. so it won't have any effect.
  {
    debug.println("Not Successful");
    while (1);
  }
  
  particleSensor_ppg_eda.setup(); 

  particleSensor_ppg_eda.setPulseAmplitudeRed(0x7F);
  particleSensor_ppg_eda.setPulseAmplitudeIR(0x7F);
  particleSensor_ppg_eda.setPulseAmplitudeGreen(0x7F);
  particleSensor_ppg_eda.setPulseAmplitudeBlue(0x7F);

 //5F
}

void loop()
{       


       
//               Serial.print( particleSensor_ppg_eda.getBlue()); 
//               Serial.print(",");
               
               Serial.println( particleSensor_ppg_eda.getIR());  
//               Serial.print(",");
//               
//               Serial.print( particleSensor_ppg_eda.getGreen());  
//               Serial.print(",");
//                 
//               Serial.println(particleSensor_ppg_eda.getRed());  

             
               
                    
}
