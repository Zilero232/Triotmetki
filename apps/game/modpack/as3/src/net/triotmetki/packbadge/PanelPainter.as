package net.triotmetki.packbadge
{
    import flash.display.DisplayObject;
    import flash.display.DisplayObjectContainer;
    import flash.events.Event;
    import flash.events.IEventDispatcher;
    import flash.geom.Rectangle;
    import flash.utils.Dictionary;
    import flash.utils.clearTimeout;
    import flash.utils.setTimeout;

    public final class PanelPainter
    {
        private static const PANEL_ALIAS:String = "playersPanel";
        private static const PANEL_FIELDS:Array = ["playersPanel", "epicRandomPlayersPanel"];
        private static const PANEL_EVENTS:Array = [Event.CHANGE, "onItemsCountChange", "stateChanged"];
        private static const LIST_EVENT:String = "itemsCountChange";
        private static const HOLDER_FIELDS:Array = ["_items", "items"];
        private static const BACKGROUNDS:Array = ["bg", "selfBg", "deadBg", "normAltBg", "deadAltBg"];
        private static const ROW_WIDTH:Number = 339;
        private static const ICON_WIDTH:Number = 63;
        private static const ROW_HEIGHT:Number = 25;
        private static const SETTLE_MS:Number = 150;

        private var page:IEventDispatcher;
        private var onGone:Function;
        private var panel:IEventDispatcher;
        private var lists:Array = [];
        private var marked:Dictionary = new Dictionary();
        private var decors:Dictionary = new Dictionary(true);
        private var settleId:uint = 0;
        private var iconBox:Rectangle = new Rectangle();
        private var rowBox:Rectangle = new Rectangle();
        private var rows:int = 0;
        private var drawn:int = 0;

        public function PanelPainter(page:IEventDispatcher, onGone:Function)
        {
            this.page = page;
            this.onGone = onGone;
            page.addEventListener(Event.REMOVED_FROM_STAGE, this.onPageRemoved, false, 0, true);
        }

        public function mark(ids:Array):String
        {
            this.marked = new Dictionary();
            for each (var id:* in ids)
            {
                this.marked[Number(id)] = true;
            }
            if (!this.attachPanel())
            {
                return "no players panel on the page";
            }
            this.paint();
            this.settleLater();
            return "rows " + this.rows + ", marked " + this.drawn + " of " + ids.length + " ids, art " + (PlateArt.source || "-");
        }

        public function dispose():void
        {
            if (this.settleId != 0)
            {
                clearTimeout(this.settleId);
                this.settleId = 0;
            }
            if (this.panel != null)
            {
                for each (var type:String in PANEL_EVENTS)
                {
                    this.panel.removeEventListener(type, this.onPanelChanged);
                }
            }
            for each (var list:IEventDispatcher in this.lists)
            {
                list.removeEventListener(LIST_EVENT, this.onPanelChanged);
            }
            for each (var decor:RowDecor in this.decors)
            {
                decor.detach();
            }
            if (this.page != null)
            {
                this.page.removeEventListener(Event.REMOVED_FROM_STAGE, this.onPageRemoved);
            }
            this.decors = new Dictionary(true);
            this.lists = [];
            this.panel = null;
            this.page = null;
        }

        private function attachPanel():Boolean
        {
            if (this.panel != null)
            {
                return true;
            }
            var found:IEventDispatcher = null;
            for each (var field:String in PANEL_FIELDS)
            {
                found = found || read(this.page, field) as IEventDispatcher;
            }
            if (found == null)
            {
                try
                {
                    found = Object(this.page).getComponent(PANEL_ALIAS) as IEventDispatcher;
                }
                catch (error:Error)
                {
                }
            }
            if (found == null)
            {
                return false;
            }
            this.panel = found;
            for each (var type:String in PANEL_EVENTS)
            {
                found.addEventListener(type, this.onPanelChanged, false, 0, true);
            }
            for each (var side:String in ["listLeft", "listRight"])
            {
                var list:IEventDispatcher = read(found, side) as IEventDispatcher;
                if (list != null)
                {
                    list.addEventListener(LIST_EVENT, this.onPanelChanged, false, 0, true);
                    this.lists.push(list);
                }
            }
            return true;
        }

        private function paint():void
        {
            this.rows = 0;
            this.drawn = 0;
            for each (var list:Object in this.lists)
            {
                this.paintList(list);
            }
        }

        private function paintList(list:Object):void
        {
            var holders:* = null;
            for each (var field:String in HOLDER_FIELDS)
            {
                holders = holders || read(list, field);
            }
            if (holders == null)
            {
                return;
            }
            for each (var holder:* in holders)
            {
                var row:DisplayObjectContainer = listItem(holder);
                if (row == null)
                {
                    continue;
                }
                this.rows++;
                if (this.marked[Number(read(holder, "vehicleID"))])
                {
                    this.decorate(row);
                    this.drawn++;
                }
                else
                {
                    this.undecorate(row);
                }
            }
        }

        private function decorate(row:DisplayObjectContainer):void
        {
            var decor:RowDecor = this.decors[row];
            if (decor == null)
            {
                decor = new RowDecor();
                this.decors[row] = decor;
            }
            decor.attach(row, backgroundTop(row));
            this.measure(row);
            decor.layout(this.iconBox, this.rowBox, Math.abs(row.transform.concatenatedMatrix.a));
        }

        private function undecorate(row:DisplayObjectContainer):void
        {
            var decor:RowDecor = this.decors[row];
            if (decor != null)
            {
                decor.detach();
                delete this.decors[row];
            }
        }

        private function measure(row:DisplayObjectContainer):void
        {
            var icon:DisplayObject = read(row, "vehicleIcon") as DisplayObject;
            var hit:DisplayObject = read(row, "hit") as DisplayObject;
            var iconBounds:Rectangle = icon != null ? icon.getBounds(row) : null;
            var rowBounds:Rectangle = hit != null ? hit.getBounds(row) : null;
            if (iconBounds != null && iconBounds.width > 0)
            {
                this.iconBox.x = iconBounds.x;
                this.iconBox.y = iconBounds.y;
                this.iconBox.width = iconBounds.width;
                this.iconBox.height = iconBounds.height;
            }
            else
            {
                this.iconBox.x = ROW_WIDTH - ICON_WIDTH;
                this.iconBox.y = 0;
                this.iconBox.width = ICON_WIDTH;
                this.iconBox.height = ROW_HEIGHT;
            }
            if (rowBounds != null && rowBounds.width > 0 && rowBounds.height > 0)
            {
                this.rowBox.x = rowBounds.x;
                this.rowBox.y = rowBounds.y;
                this.rowBox.width = rowBounds.width;
                this.rowBox.height = rowBounds.height;
            }
            else
            {
                this.rowBox.x = this.iconBox.right - ROW_WIDTH;
                this.rowBox.y = 0;
                this.rowBox.width = ROW_WIDTH;
                this.rowBox.height = ROW_HEIGHT;
            }
        }

        private function settleLater():void
        {
            if (this.settleId == 0)
            {
                this.settleId = setTimeout(this.onSettle, SETTLE_MS);
            }
        }

        private function onSettle():void
        {
            this.settleId = 0;
            this.paint();
        }

        private function onPanelChanged(event:Event):void
        {
            this.paint();
            this.settleLater();
        }

        private function onPageRemoved(event:Event):void
        {
            var gone:Function = this.onGone;
            var page:IEventDispatcher = this.page;
            this.dispose();
            gone(page);
        }

        private static function listItem(holder:*):DisplayObjectContainer
        {
            try
            {
                return holder.getListItem() as DisplayObjectContainer;
            }
            catch (error:Error)
            {
            }
            return read(holder, "_listItem") as DisplayObjectContainer;
        }

        private static function backgroundTop(row:DisplayObjectContainer):int
        {
            var top:int = -1;
            for each (var name:String in BACKGROUNDS)
            {
                var background:DisplayObject = read(row, name) as DisplayObject;
                if (background != null && background.parent == row)
                {
                    top = Math.max(top, row.getChildIndex(background));
                }
            }
            return top;
        }

        private static function read(target:*, name:String):*
        {
            if (target == null)
            {
                return null;
            }
            try
            {
                return target[name];
            }
            catch (error:Error)
            {
            }
            return null;
        }
    }
}
