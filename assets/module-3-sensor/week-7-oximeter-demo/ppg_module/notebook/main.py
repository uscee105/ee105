import serial
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.widgets import Button
import csv
import datetime
import time
import collections

# Prompt user to enter the serial port number
port = input("Enter the serial port (e.g., COM5 or /dev/ttyUSB0): ").strip()

# Set up serial connection with the user-provided port
ser = serial.Serial(port, 115200, timeout=1)

time.sleep(2)

print("="*50)
print("Note:")
print("Ensure Module 3 is activated before proceeding.")
print("Activate the PPG sensor on the EE105 devboard using the command 'm3ppg'.")
print("="*50)

print("Type your command:")
command = input("> ").strip()
ser.write((command + '\n').encode())
print("-"*50)

# Data storage for RED and IR values
red_data = collections.deque(maxlen=1000)  # Keep the last 1000 RED data points
ir_data = collections.deque(maxlen=1000)   # Keep the last 1000 IR data points

# Data capture state
capturing = False

# Set up live plotting with two subplots
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))  # 2 rows, 1 column, adjust figure size
red_line, = ax1.plot([], [], lw=2, label='RED', color='red')
ir_line, = ax2.plot([], [], lw=2, label='IR', color='blue')
ax1.set_xlim(0, 1000)  # Display the last 1000 data points on RED subplot
ax2.set_xlim(0, 1000)  # Display the last 1000 data points on IR subplot

# Add legends to the subplots
ax1.legend()
ax2.legend()

# Capture data button callback
def start_capture(event):
    global capturing
    capturing = True
    print("Started capturing data.")

# Save data button callback
def save_data(event):
    if len(red_data) == 0 or len(ir_data) == 0:
        print("No data to save.")
        return
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"data_capture_{timestamp}.csv"
    with open(filename, 'w', newline='') as csvfile:
        csvwriter = csv.writer(csvfile)
        # Write only data values, no header and no index
        for r, i in zip(red_data, ir_data):
            csvwriter.writerow([r, i])
    print(f"Data saved to {filename}")

# Set up the Capture button
ax_capture = plt.axes([0.7, 0.025, 0.1, 0.04])
btn_capture = Button(ax_capture, 'Capture')
btn_capture.on_clicked(start_capture)

# Set up the Save button
ax_save = plt.axes([0.8, 0.025, 0.1, 0.04])
btn_save = Button(ax_save, 'Save')
btn_save.on_clicked(save_data)

# Update plot function
def update(frame):
    if capturing:
        # Read available data from the serial buffer
        while ser.in_waiting > 0:
            line_data = ser.readline().decode('utf-8').strip()
            if line_data:
                try:
                    # Split the received data into RED and IR values
                    red_value, ir_value = map(float, line_data.split(','))
                    red_data.append(red_value)
                    ir_data.append(ir_value)
                except ValueError:
                    continue

        # Update the plots with the new data
        ydata_red = list(red_data)
        ydata_ir = list(ir_data)
        xdata = list(range(len(ydata_red)))  # Update xdata to match the length of ydata

        # Update the RED subplot
        red_line.set_ydata(ydata_red)
        red_line.set_xdata(xdata)

        # Update the IR subplot
        ir_line.set_ydata(ydata_ir)
        ir_line.set_xdata(xdata)

        # Recalculate limits and autoscale the view for both subplots
        ax1.relim()
        ax1.autoscale_view()
        ax2.relim()
        ax2.autoscale_view()

        # Adjust x-axis limits to show the last 1000 samples
        if len(ydata_red) > 1000:
            ax1.set_xlim(len(ydata_red) - 1000, len(ydata_red))
            ax2.set_xlim(len(ydata_red) - 1000, len(ydata_red))

    return red_line, ir_line,

# Set up the animation with blit=False to redraw the entire plot
ani = animation.FuncAnimation(fig, update, interval=100, blit=False)

# Display the plot
plt.show()
