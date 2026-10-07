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

    public final class BadgePainter
    {
        private static const PANEL_FIELDS:Array = ["playersPanel", "epicRandomPlayersPanel"];
        private static const PANEL_ALIAS:String = "playersPanel";
        private static const PANEL_EVENTS:Array = [Event.CHANGE, "onItemsCountChange", "stateChanged"];
        private static const PANEL_LISTS:Array = ["listLeft", "listRight"];
        private static const LIST_EVENT:String = "itemsCountChange";
        private static const PANEL_HOLDERS:Array = ["_items", "items"];
        private static const PANEL_BACKGROUNDS:Array = ["bg", "selfBg", "deadBg", "normAltBg", "deadAltBg"];
        private static const TAB_FIELD:String = "fullStats";
        private static const TAB_CONTROLLER:String = "tableCtrl";
        private static const TAB_SIDES:Array = ["allyRenderers", "enemyRenderers"];
        private static const TAB_ICONS:Array = ["vehicleIcon", "_vehicleIcon"];
        private static const LOADING_FIELD:String = "battleLoading";
        private static const LOADING_FORM:String = "form";
        private static const LOADING_SIDES:Array = ["_allyRenderers", "_enemyRenderers"];
        private static const PROVIDERS:Array = ["_teamDP", "_enemyDP"];
        private static const PROVIDER_EVENT:String = "validateItems";
        private static const ROW_WIDTH:Number = 339;
        private static const ICON_WIDTH:Number = 63;
        private static const ROW_HEIGHT:Number = 25;
        private static const MIN_SLOT_HEIGHT:Number = 22;
        private static const FRAGS_REACH:Number = 60;
        private static const SETTLE_MS:Number = 150;

        private var page:IEventDispatcher;
        private var onGone:Function;
        private var panel:IEventDispatcher;
        private var lists:Array = [];
        private var table:Object;
        private var loading:Object;
        private var watched:Array = [];
        private var marked:Dictionary = new Dictionary();
        private var decors:Dictionary = new Dictionary(true);
        private var settleId:uint = 0;
        private var anchor:Rectangle = new Rectangle();
        private var row:Rectangle = new Rectangle();
        private var rows:int = 0;
        private var drawn:int = 0;
        private var waiting:int = 0;

        public function BadgePainter(page:IEventDispatcher, onGone:Function)
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
            return this.repaint() + " | ids " + ids.length;
        }

        public function repaint():String
        {
            this.attachPanel();
            this.attachTable();
            this.attachLoading();
            var status:String = this.paint();
            this.settleLater();
            return status + " | art " + (PlateArt.source || "-");
        }

        public function dispose():void
        {
            if (this.settleId != 0)
            {
                clearTimeout(this.settleId);
                this.settleId = 0;
            }
            for each (var entry:Array in this.watched)
            {
                try
                {
                    entry[0].removeEventListener(entry[1], this.onChanged);
                }
                catch (error:Error)
                {
                }
            }
            for each (var decor:RowDecor in this.decors)
            {
                decor.detach();
            }
            if (this.page != null)
            {
                this.page.removeEventListener(Event.REMOVED_FROM_STAGE, this.onPageRemoved);
            }
            this.watched = [];
            this.decors = new Dictionary(true);
            this.lists = [];
            this.panel = null;
            this.table = null;
            this.loading = null;
            this.page = null;
        }

        private function paint():String
        {
            return "panel " + this.paintPanel() + " | tab " + this.paintTable() + " | loading " + this.paintLoading();
        }

        private function attachPanel():void
        {
            if (this.panel != null)
            {
                return;
            }
            var found:IEventDispatcher = null;
            for each (var field:String in PANEL_FIELDS)
            {
                found = found || read(this.page, field) as IEventDispatcher;
            }
            found = found || component(this.page, PANEL_ALIAS) as IEventDispatcher;
            if (found == null)
            {
                return;
            }
            this.panel = found;
            for each (var type:String in PANEL_EVENTS)
            {
                this.listen(found, type);
            }
            for each (var side:String in PANEL_LISTS)
            {
                var list:Object = read(found, side);
                if (list != null)
                {
                    this.listen(list, LIST_EVENT);
                    this.lists.push(list);
                }
            }
        }

        private function attachTable():void
        {
            if (this.table != null)
            {
                return;
            }
            var stats:Object = read(this.page, TAB_FIELD) || component(this.page, TAB_FIELD);
            this.table = read(stats, TAB_CONTROLLER);
            this.listenProviders(this.table);
        }

        private function attachLoading():void
        {
            if (this.loading != null)
            {
                return;
            }
            var screen:Object = read(this.page, LOADING_FIELD) || component(this.page, LOADING_FIELD);
            this.loading = read(screen, LOADING_FORM);
            this.listenProviders(this.loading);
        }

        private function listenProviders(owner:Object):void
        {
            for each (var field:String in PROVIDERS)
            {
                var provider:Object = read(owner, field);
                if (provider != null)
                {
                    this.listen(provider, PROVIDER_EVENT);
                }
            }
        }

        private function listen(target:Object, type:String):void
        {
            try
            {
                target.addEventListener(type, this.onChanged, false, 0, true);
                this.watched.push([target, type]);
            }
            catch (error:Error)
            {
            }
        }

        private function paintPanel():String
        {
            if (this.panel == null)
            {
                return "not found";
            }
            this.resetCounts();
            for each (var list:Object in this.lists)
            {
                for each (var holder:* in holdersOf(list))
                {
                    this.paintPanelRow(holder);
                }
            }
            return this.counts();
        }

        private function paintPanelRow(holder:*):void
        {
            var item:DisplayObjectContainer = listItem(holder);
            if (item == null)
            {
                return;
            }
            this.rows++;
            if (!this.marked[Number(read(holder, "vehicleID"))])
            {
                this.undecorate(item);
                return;
            }
            this.measurePanelRow(item);
            var decor:RowDecor = this.decorFor(item);
            decor.removeStrip();
            decor.attach(item, backgroundTop(item) + 1);
            decor.layout(this.anchor, this.row, onScreenScale(item));
            this.drawn++;
        }

        private function paintTable():String
        {
            if (this.table == null)
            {
                return "not found";
            }
            this.resetCounts();
            for each (var side:String in TAB_SIDES)
            {
                for each (var holder:* in read(this.table, side))
                {
                    var item:Object = read(holder, "statsItem");
                    var icon:DisplayObject = firstOf(item, TAB_ICONS) as DisplayObject;
                    var id:Number = Number(call(holder, "getVehicleID"));
                    this.paintSlot(icon, id, read(item, "_playerNameTF") as DisplayObject, read(item, "_fragsTF") as DisplayObject);
                }
            }
            return this.counts();
        }

        private function paintLoading():String
        {
            if (this.loading == null)
            {
                return "not found";
            }
            this.resetCounts();
            for each (var side:String in LOADING_SIDES)
            {
                for each (var renderer:* in read(this.loading, side))
                {
                    var icon:DisplayObject = read(renderer, "_vehicleIcon") as DisplayObject;
                    var id:Number = Number(read(read(renderer, "model"), "vehicleID"));
                    this.paintSlot(icon, id, read(renderer, "_textField") as DisplayObject, null);
                }
            }
            return this.counts();
        }

        private function paintSlot(icon:DisplayObject, id:Number, name:DisplayObject, frags:DisplayObject):void
        {
            if (icon == null || icon.parent == null)
            {
                return;
            }
            this.rows++;
            if (!this.marked[id])
            {
                this.undecorate(icon);
                return;
            }
            var container:DisplayObjectContainer = icon.parent;
            if (!this.measureSlot(container, icon, name, frags))
            {
                this.undecorate(icon);
                this.waiting++;
                return;
            }
            var decor:RowDecor = this.decorFor(icon);
            decor.removeStrip();
            decor.attach(container, lowestIndex(container, icon, name));
            decor.layout(this.anchor, this.row, onScreenScale(container));
            this.drawn++;
        }

        private function measurePanelRow(item:DisplayObjectContainer):void
        {
            var icon:Rectangle = boundsIn(read(item, "vehicleIcon") as DisplayObject, item);
            var hit:Rectangle = boundsIn(read(item, "hit") as DisplayObject, item);
            if (icon != null)
            {
                copy(icon, this.anchor);
            }
            else
            {
                this.anchor.x = ROW_WIDTH - ICON_WIDTH;
                this.anchor.y = 0;
                this.anchor.width = ICON_WIDTH;
                this.anchor.height = ROW_HEIGHT;
            }
            if (hit != null)
            {
                copy(hit, this.row);
            }
            else
            {
                this.row.x = this.anchor.right - ROW_WIDTH;
                this.row.y = 0;
                this.row.width = ROW_WIDTH;
                this.row.height = ROW_HEIGHT;
            }
        }

        private function measureSlot(container:DisplayObjectContainer, iconObject:DisplayObject, nameObject:DisplayObject, fragsObject:DisplayObject):Boolean
        {
            var icon:Rectangle = boundsIn(iconObject, container);
            if (icon == null)
            {
                return false;
            }
            var name:Rectangle = boundsIn(nameObject, container) || icon;
            var outwardRight:Boolean = icon.x + icon.width / 2 >= name.x + name.width / 2;
            copy(icon, this.anchor);
            var frags:Rectangle = boundsIn(fragsObject, container);
            if (frags != null && outwardRight && frags.left >= icon.left && frags.left - icon.right < FRAGS_REACH)
            {
                this.anchor.width = Math.max(icon.right, frags.right) - this.anchor.x;
            }
            if (frags != null && !outwardRight && frags.right <= icon.right && icon.left - frags.right < FRAGS_REACH)
            {
                this.anchor.x = Math.min(icon.left, frags.left);
                this.anchor.width = icon.right - this.anchor.x;
            }
            var height:Number = Math.max(MIN_SLOT_HEIGHT, icon.height);
            this.row.x = Math.min(name.left, this.anchor.left);
            this.row.width = Math.max(name.right, this.anchor.right) - this.row.x;
            this.row.y = icon.y + icon.height / 2 - height / 2;
            this.row.height = height;
            return true;
        }

        private function decorFor(key:Object):RowDecor
        {
            var decor:RowDecor = this.decors[key];
            if (decor == null)
            {
                decor = new RowDecor();
                this.decors[key] = decor;
            }
            return decor;
        }

        private function undecorate(key:Object):void
        {
            var decor:RowDecor = this.decors[key];
            if (decor != null)
            {
                decor.detach();
                delete this.decors[key];
            }
        }

        private function resetCounts():void
        {
            this.rows = 0;
            this.drawn = 0;
            this.waiting = 0;
        }

        private function counts():String
        {
            return "rows " + this.rows + ", marked " + this.drawn + (this.waiting > 0 ? ", not drawn yet " + this.waiting : "");
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

        private function onChanged(event:Event):void
        {
            this.settleLater();
        }

        private function onPageRemoved(event:Event):void
        {
            var gone:Function = this.onGone;
            var page:IEventDispatcher = this.page;
            this.dispose();
            gone(page);
        }

        private static function holdersOf(list:Object):*
        {
            return firstOf(list, PANEL_HOLDERS);
        }

        private static function listItem(holder:*):DisplayObjectContainer
        {
            return (call(holder, "getListItem") || read(holder, "_listItem")) as DisplayObjectContainer;
        }

        private static function backgroundTop(item:DisplayObjectContainer):int
        {
            var top:int = -1;
            for each (var field:String in PANEL_BACKGROUNDS)
            {
                var background:DisplayObject = read(item, field) as DisplayObject;
                if (background != null && background.parent == item)
                {
                    top = Math.max(top, item.getChildIndex(background));
                }
            }
            return top;
        }

        private static function lowestIndex(container:DisplayObjectContainer, icon:DisplayObject, name:DisplayObject):int
        {
            var index:int = container.getChildIndex(icon);
            if (name != null && name.parent == container)
            {
                index = Math.min(index, container.getChildIndex(name));
            }
            return index;
        }

        private static function boundsIn(target:DisplayObject, space:DisplayObject):Rectangle
        {
            if (target == null)
            {
                return null;
            }
            var bounds:Rectangle = target.getBounds(space);
            return bounds.width > 0 && bounds.height > 0 ? bounds : null;
        }

        private static function copy(source:Rectangle, target:Rectangle):void
        {
            target.x = source.x;
            target.y = source.y;
            target.width = source.width;
            target.height = source.height;
        }

        private static function onScreenScale(target:DisplayObject):Number
        {
            return Math.abs(target.transform.concatenatedMatrix.a);
        }

        private static function component(page:Object, alias:String):Object
        {
            try
            {
                return page.getComponent(alias);
            }
            catch (error:Error)
            {
            }
            return null;
        }

        private static function call(target:*, name:String):*
        {
            try
            {
                return target[name]();
            }
            catch (error:Error)
            {
            }
            return null;
        }

        private static function firstOf(target:*, names:Array):*
        {
            for each (var name:String in names)
            {
                var value:* = read(target, name);
                if (value != null)
                {
                    return value;
                }
            }
            return null;
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
