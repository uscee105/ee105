This README assumes Arduino IDE and Python v3 are installed.
The following Python library package is required: Pillow (https://python-pillow.org/)

1. Ensure that Pillow PySerial functions are installed. 
	1a. Install with pip:$ python -m pip install Pillow pyserial
2. Install (add) the OV7675 library to the Arduino IDE via Sketch -> Include Library -> Add ZIP Library...
	2a. Locate and add "Arduino_OV767X.zip" from the camera_code/Arduino folder.
3. Connect the Arduino device to USB port and identify the corresponding COM port.
	3a. Ensure that the Mbed OS Nano Boards package is installed (Tools -> Board: -> Boards Manager... -> Install "Arduino Mbed OS Nano Boards"
	3b. Ensure the correct board model is connected to the Arduino IDE (Tools -> Board: -> Arduino Mbed OS Nano Boards -> Arduino Nano 33 BLE
	3c. Connect the Arduino device to the IDE via Tools -> Port -> [select COM port]
4. Compile and upload the "tinyML_camera.ino" sketch to the Arduino Nano board by performing the following:
	4a. (Optional): Verify the sketch by going to: Sketch -> Verify/Compile
	4b. Quickly double-tap the beige reset button on the BLE Nano board to trigger the bootloader.
	4c. Upload the sketch to the board by going to: Sketch -> Upload
	4d. Upon completion of sketch upload, must reconnect to the board via Tools -> Port -> [select COM port]
5. Run the Python script "tinyML_camera_capture.py" to initiate live feed and save images with custom class labels for use with ML training.
	5a. This can be done either via an IDE or via the following command (must either specify or otherwise be in the same directory):$ python tinyML_camera_capture.py
	

 