export const JACK = `
R2 = 0;
while (true) {
    R2 = !R2
    R0 = 32;
    while (R0-->0) {
        R1 = 256;
        while (R1-->0) {
            SCREEN[R1 * 32 + R1] = R2;
        }
    }
}
`;

export const ASM = `
@R2 M=0 // R2 = 0
(OUTER)
    @R2 D=M M=!D // R2 = !R2
    @32 D=A @R0 M=D // R0 = 32
    (ROW) @R0 D=M @R3 M=D @R0 M=D-1 @ROW_END D;JEQ  // while R0 --> 0
        @256 D=A @R1 M=D // R1 = 256
        (COL) @R1 D=M @R3 M=D @R1 M=D-1 @COL_END D;JEQ  // while R1 --> 0
            @R5 M=0
            @32 D=A @R3 M=D // R3 = 32
            @R1 D=M @R4 M=D // R4 = R1
            (MUL)
                @R3 D=M @MUL_END D;JEQ // while R3 > 0
                @R3 D=M @R5 D=D+M // R5 += R3
                @R3 M=M-1 // R3 -= 1
                @MUL 0;JMP
            (MUL_END) // R5 = 32 * R1
            @R1 D=M @R5 D=M+D @SCREEN D=A+D @R3 M=D // R3 = R1 + R5 + SCREEN
            @R2 D=M @R3 M=D // SCREEN + (R1 * 32 + R1) = R2;
        (COL_END)
    (ROW_END)
(OUTER_END)
`;
export const HACK = ``;
