package net.triotmetki.packbadge
{
    import flash.display.DisplayObjectContainer;
    import flash.display.GradientType;
    import flash.display.Shape;
    import flash.display.Sprite;
    import flash.geom.Matrix;
    import flash.geom.Rectangle;

    public final class RowDecor
    {
        private static const COLORS:Array = [0xFF5500, 0xFF5500];
        private static const RATIOS:Array = [0, 255];
        private static const TOWARD_ANCHOR:Array = [0, 0.3];
        private static const FROM_ANCHOR:Array = [0.3, 0];
        private static const GAP:Number = 10;
        private static const PLATE_TAIL:Number = 6;
        private static const STRIP_WIDTH:Number = 240;
        private static const MATRIX:Matrix = new Matrix();

        private var strip:Shape = new Shape();
        private var plate:Sprite = new Sprite();
        private var stripX:Number = NaN;
        private var stripY:Number = NaN;
        private var stripWidth:Number = NaN;
        private var stripHeight:Number = NaN;

        public function RowDecor()
        {
            this.plate.mouseEnabled = false;
            this.plate.mouseChildren = false;
            this.plate.tabEnabled = false;
            this.plate.tabChildren = false;
            this.plate.addChild(PlateArt.create());
        }

        public function removeStrip():void
        {
            if (this.strip.parent != null)
            {
                this.strip.parent.removeChild(this.strip);
            }
        }

        public function attach(container:DisplayObjectContainer, stripIndex:int, withPlate:Boolean):void
        {
            this.placeStrip(container, stripIndex);
            if (!withPlate)
            {
                this.removePlate();
                return;
            }
            if (this.plate.parent != container)
            {
                container.addChild(this.plate);
            }
        }

        private function removePlate():void
        {
            if (this.plate.parent != null)
            {
                this.plate.parent.removeChild(this.plate);
            }
        }

        private function placeStrip(container:DisplayObjectContainer, stripIndex:int):void
        {
            var index:int = stripIndex;
            if (this.strip.parent == container)
            {
                var current:int = container.getChildIndex(this.strip);
                if (current < index)
                {
                    index--;
                }
                if (current == index)
                {
                    return;
                }
            }

            this.removeStrip();
            var clamped:int = Math.max(0, Math.min(index, container.numChildren));
            container.addChildAt(this.strip, clamped);
        }

        public function detach():void
        {
            this.removeStrip();
            this.removePlate();
        }

        public function layout(anchor:Rectangle, row:Rectangle, withPlate:Boolean):void
        {
            var outwardRight:Boolean = anchor.x + anchor.width / 2 >= row.x + row.width / 2;
            var plateLeft:Number = outwardRight ? anchor.right + GAP : anchor.left - GAP - PlateArt.WIDTH;
            var plateRight:Number = plateLeft + PlateArt.WIDTH;

            this.plate.x = Math.round(plateLeft);
            this.plate.y = Math.round(row.y + (row.height - PlateArt.HEIGHT) / 2);

            var outerEdge:Number = withPlate ? plateRight + PLATE_TAIL : anchor.right;
            var innerEdge:Number = withPlate ? plateLeft - PLATE_TAIL : anchor.left;
            var left:Number = outwardRight ? Math.max(row.left, anchor.right - STRIP_WIDTH) : innerEdge;
            var right:Number = outwardRight ? outerEdge : Math.min(row.right, anchor.left + STRIP_WIDTH);
            this.drawStrip(left, row.y, right - left, row.height, outwardRight);
        }

        private function drawStrip(x:Number, y:Number, width:Number, height:Number, towardRight:Boolean):void
        {
            if (x == this.stripX && y == this.stripY && width == this.stripWidth && height == this.stripHeight)
            {
                return;
            }
            this.stripX = x;
            this.stripY = y;
            this.stripWidth = width;
            this.stripHeight = height;
            this.strip.graphics.clear();
            if (width <= 0 || height <= 0)
            {
                return;
            }
            MATRIX.createGradientBox(width, height, 0, x, y);
            this.strip.graphics.beginGradientFill(GradientType.LINEAR, COLORS, towardRight ? TOWARD_ANCHOR : FROM_ANCHOR, RATIOS, MATRIX);
            this.strip.graphics.drawRect(x, y, width, height);
            this.strip.graphics.endFill();
        }
    }
}
