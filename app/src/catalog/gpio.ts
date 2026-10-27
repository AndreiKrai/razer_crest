/**
 * The controller's GPIO budget. Mirrors docs/HARDWARE.md ("GPIO allocation by module").
 * Only the budget logic reads these numbers; the user never sees GPIOs.
 */

// Output pins wired to each motor socket of the controller, 4 per TB6612 driver. The wiring is fixed in the kit,
// so a socket can't borrow another socket's pins. They never overlap with the TLC5940 chain (23, 18, 5, 4, 15),
// which any number of lighting boards shares, so lights and motors don't compete.
// 5, 15 (strapping, noisy at boot), 12 (breaks boot) and 14 (boot PWM) are never motor pins.
export const MOTOR_SOCKET_PINS: Record<string, number[]> = {
  motors: [26, 13, 27, 25, 33, 32, 16, 17],
  // GPIO 2 is a strapping pin; using it for a TB6612 input is unverified (HARDWARE.md O20).
  motors2: [19, 21, 22, 2],
};

export const PINS_PER_DRIVER = 4;
