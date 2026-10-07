package net.triotmetki.packbadge
{
    import flash.display.CapsStyle;
    import flash.display.Graphics;
    import flash.display.JointStyle;
    import flash.display.LineScaleMode;
    import flash.display.Shape;

    public final class PlateArt
    {
        public static const WIDTH:Number = 36;
        public static const HEIGHT:Number = 18;
        private static const DESIGN_SCALE:Number = 0.5;
        private static const PLATE_FILL:uint = 0x0E0E10;
        private static const PLATE_LINE:uint = 0xFF5500;
        private static const WORDMARK:uint = 0xFFB000;
        private static const BARS:Array = [
            [0xFF5500, 6, 28, 10, 28, 16, 8, 12, 8],
            [0xFF7F00, 12.5, 28, 16.5, 28, 22.5, 8, 18.5, 8],
            [0xFFB000, 19, 28, 23, 28, 29, 8, 25, 8]
        ];
        private static const GLYPHS:Array = [
            [33, 7.5, 36.6, 7.5],
            [34.8, 7.5, 34.8, 15.5],
            [38, 15.5, 38, 7.5, 41.6, 7.5, 41.6, 11.9, 38, 11.9],
            [43, 7.5, 43, 15.5, 46.6, 7.5, 46.6, 15.5],
            [33, 20.5, 36.6, 20.5, 36.6, 28.5, 33, 28.5, 33, 20.5],
            [38, 20.5, 41.6, 20.5],
            [39.8, 20.5, 39.8, 28.5],
            [43, 28.5, 43, 20.5, 44.8, 25.3, 46.6, 20.5, 46.6, 28.5],
            [51.6, 20.5, 48, 20.5, 48, 28.5, 51.6, 28.5],
            [48, 24.5, 50.88, 24.5],
            [53, 20.5, 56.6, 20.5],
            [54.8, 20.5, 54.8, 28.5],
            [58, 20.5, 58, 28.5],
            [61.6, 20.5, 58, 24.5, 61.6, 28.5],
            [63, 20.5, 63, 28.5, 66.6, 20.5, 66.6, 28.5]
        ];

        public static function create():Shape
        {
            var shape:Shape = new Shape();
            draw(shape.graphics);
            return shape;
        }

        private static function draw(graphics:Graphics):void
        {
            var unit:Number = DESIGN_SCALE;
            graphics.lineStyle(2 * unit, PLATE_LINE, 0.9);
            graphics.beginFill(PLATE_FILL, 0.82);
            graphics.drawRoundRect(unit, unit, 70 * unit, 34 * unit, 10 * unit, 10 * unit);
            graphics.endFill();
            graphics.lineStyle();
            for each (var bar:Array in BARS)
            {
                graphics.beginFill(bar[0]);
                graphics.moveTo(bar[1] * unit, bar[2] * unit);
                for (var corner:int = 3; corner < bar.length; corner += 2)
                {
                    graphics.lineTo(bar[corner] * unit, bar[corner + 1] * unit);
                }
                graphics.endFill();
            }
            graphics.lineStyle(1.6 * unit, WORDMARK, 1, false, LineScaleMode.NORMAL, CapsStyle.NONE, JointStyle.MITER);
            for each (var glyph:Array in GLYPHS)
            {
                graphics.moveTo(glyph[0] * unit, glyph[1] * unit);
                for (var point:int = 2; point < glyph.length; point += 2)
                {
                    graphics.lineTo(glyph[point] * unit, glyph[point + 1] * unit);
                }
            }
        }
    }
}
