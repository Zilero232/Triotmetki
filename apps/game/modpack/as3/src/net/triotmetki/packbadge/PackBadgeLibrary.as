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
                var painter:PanelPainter = painters[page];
                if (painter == null)
                {
                    painter = new PanelPainter(page as IEventDispatcher, forget);
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

        public static function clear(page:*):String
        {
            try
            {
                var painter:PanelPainter = painters[page];
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
