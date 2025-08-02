The Arduino codes in this package were developed as a LIFI demonstration of free space 
communication using an LED for the Tx module and an LDR for the Rx module.

The "Tx-Rx button test" folder contains Arduino codes used for troubleshooting ease and 
testing different ambient lighting conditions to ensure that the LDR on the Rx module could
detect a signal. As such, these codes are only useful for breadboard prototyping.

The "receiver" and "transmitter" folders contain their respective Rx and Tx codes used to 
ASCII encode a message (e.g., "Hello World"), transmit the bits by flashing the LED with 
a fixed period, and decode on the Rx end. I was able to successfully achieve a reliable 
~0.3kHz bitrate channel using my prototype. I have not tested these codes on the EE 105 
boards since I require (2) boards and only have (1) as of writing this ReadMe document.
Iterative testing and modification of these codes are expected since (to my knowledge) 
the Rx component on the EE 105 board does not utilize an LDR.

I recommend starting with a longer period (e.g., 50ms) for initial testing. Please note 
that the value chosen for the period must match for both the Tx and Rx modules.
