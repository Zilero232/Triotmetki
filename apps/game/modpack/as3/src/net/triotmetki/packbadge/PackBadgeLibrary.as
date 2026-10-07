package net.triotmetki.packbadge
{
    import flash.display.Sprite;
    import flash.events.IEventDispatcher;
    import flash.utils.Dictionary;
    import flash.utils.getDefinitionByName;

    public class PackBadgeLibrary extends Sprite
    {
        private static const PAGE_CLASS:String = "net.wg.gui.battle.views.BaseBattlePage";
        private static const painters:Dictionary = new Dictionary();

        public function PackBadgeLibrary()
        {
            super();
            try
            {
                var prototype:Object = Object(getDefinitionByName(PAGE_CLASS)).prototype;
                prototype.as_otmetkiPackBadge = function(ids:Array):String
                {
                    return PackBadgeLibrary.mark(this, ids);
                };
                prototype.as_otmetkiPackBadgeRepaint = function():String
                {
                    return PackBadgeLibrary.repaint(this);
                };
                prototype.as_otmetkiPackBadgeClear = function():String
                {
                    return PackBadgeLibrary.clear(this);
                };
            }
            catch (error:Error)
            {
            }
        }

        public static function mark(page:*, ids:Array):String
        {
            try
            {
                var painter:BadgePainter = painters[page];
                if (painter == null)
                {
                    painter = new BadgePainter(page as IEventDispatcher, forget);
                    painters[page] = painter;
                }
                return painter.mark(ids || []);
            }
            catch (error:Error)
            {
                return "error " + error.message;
            }
            return "";
        }

        public static function repaint(page:*):String
        {
            try
            {
                var painter:BadgePainter = painters[page];
                return painter != null ? painter.repaint() : "nothing marked yet";
            }
            catch (error:Error)
            {
                return "error " + error.message;
            }
            return "";
        }

        public static function clear(page:*):String
        {
            try
            {
                var painter:BadgePainter = painters[page];
                if (painter == null)
                {
                    return "nothing to clear";
                }
                forget(page);
                painter.dispose();
                return "cleared";
            }
            catch (error:Error)
            {
                return "error " + error.message;
            }
            return "";
        }

        private static function forget(page:*):void
        {
            delete painters[page];
        }
    }
}
