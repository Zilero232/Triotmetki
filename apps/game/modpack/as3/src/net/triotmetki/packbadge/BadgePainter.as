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
        private static const PANEL_EVENTS:Array = [Event.CHANGE, "onItemsCountChange", "stateChanged"];
        private static const PANEL_LISTS:Array = ["listLeft", "listRight"];
        private static const LIST_EVENT:String = "itemsCountChange";
        private static const PANEL_BACKGROUNDS:Array = ["bg", "selfBg", "deadBg", "normAltBg", "deadAltBg"];
        private static const TAB_FIELD:String = "fullStats";
        private static const TAB_TABLE:String = "statsTable";
        private static const TAB_ICONS:String = "vehicleIconCollection";
        private static const TAB_NAMES:String = "playerNameCollection";
        private static const TAB_FRAGS:String = "fragsCollection";
        private static const LOADING_FIELD:String = "battleLoading";
        private static const LOADING_FORM:String = "form";
        private static const LOADING_CONTAINER:String = "container";
        private static const LOADING_ICONS:Array = ["vehicleIconsAlly", "vehicleIconsEnemy"];
        private static const LOADING_NAMES:Array = ["textFieldsAlly", "textFieldsEnemy"];
        private static const SIDES:Array = [false, true];
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
        private var panelField:String;
        private var tableController:Object;
        private var loadingForm:Object;
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
            return status;
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
            this.panel = null;
            this.tableController = null;
            this.loadingForm = null;
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
            for each (var field:String in PANEL_FIELDS)
            {
                var found:IEventDispatcher = read(this.page, field) as IEventDispatcher;
                if (found != null && this.panel == null)
                {
                    this.panel = found;
                    this.panelField = field;
                }
            }
            if (this.panel == null)
            {
                return;
            }
            for each (var type:String in PANEL_EVENTS)
            {
                this.listen(this.panel, type);
            }
            for each (var side:String in PANEL_LISTS)
            {
                this.listen(read(this.panel, side), LIST_EVENT);
            }
        }

        private function attachTable():void
        {
            if (this.tableController != null)
            {
                return;
            }
            this.tableController = ClientFields.tableController(read(this.page, TAB_FIELD));
            this.listenProviders(this.tableController);
        }

        private function attachLoading():void
        {
            if (this.loadingForm != null)
            {
                return;
            }
            this.loadingForm = read(read(this.page, LOADING_FIELD), LOADING_FORM);
            this.listenProviders(this.loadingForm);
        }

        private function listenProviders(owner:Object):void
        {
            if (owner == null)
            {
                return;
            }
            for each (var provider:Object in ClientFields.providers(owner))
            {
                this.listen(provider, PROVIDER_EVENT);
            }
        }

        private function listen(target:Object, type:String):void
        {
            if (target == null)
            {
                return;
            }
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
                return "not found (no page." + PANEL_FIELDS.join(" or page.") + ")";
            }
            this.resetCounts();
            var holders:int = 0;
            var unreadable:Array = [];
            for each (var side:String in PANEL_LISTS)
            {
                var list:Object = ClientFields.panelHolders(read(this.panel, side));
                if (list == null)
                {
                    unreadable.push(side + "._items");
                    continue;
                }
                for each (var holder:* in list)
                {
                    holders++;
                    this.paintPanelRow(holder);
                }
            }
            var gaps:String = unreadable.length > 0 ? " (unreadable " + unreadable.join(", ") + ")" : "";
            return this.panelField + " holders " + holders + gaps + ", " + this.counts();
        }

        private function paintPanelRow(holder:*):void
        {
            var item:DisplayObjectContainer = call(holder, "getListItem") as DisplayObjectContainer;
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
            decor.layout(this.anchor, this.row);
            this.drawn++;
        }

        private function paintTable():String
        {
            if (this.tableController == null)
            {
                return "not found (no page." + TAB_FIELD + ".tableCtrl)";
            }
            var table:Object = read(read(this.page, TAB_FIELD), TAB_TABLE);
            var icons:Object = read(table, TAB_ICONS);
            var names:Object = read(table, TAB_NAMES);
            if (icons == null || names == null)
            {
                return "not found (no " + TAB_FIELD + "." + TAB_TABLE + "." + TAB_ICONS + ")";
            }
            this.resetCounts();
            var numRows:int = int(read(table, "numRows"));
            var frags:Object = read(table, TAB_FRAGS);
            var holders:int = 0;
            for each (var enemy:Boolean in SIDES)
            {
                var renderers:Object = ClientFields.tableRenderers(this.tableController, enemy);
                for (var index:int = 0; renderers != null && index < renderers.length; index++)
                {
                    var holder:* = renderers[index];
                    holders++;
                    if (!read(holder, "containsData"))
                    {
                        continue;
                    }
                    var cell:int = (enemy ? numRows : 0) + index;
                    var id:Number = Number(call(holder, "getVehicleID"));
                    this.paintSlot(icons[cell] as DisplayObject, id, names[cell] as DisplayObject, frags != null ? frags[cell] as DisplayObject : null);
                }
            }
            return "tableCtrl holders " + holders + ", " + this.counts();
        }

        private function paintLoading():String
        {
            var form:DisplayObjectContainer = this.loadingForm as DisplayObjectContainer;
            if (form == null)
            {
                return "not found (no page." + LOADING_FIELD + "." + LOADING_FORM + ")";
            }
            var container:Object = form.getChildByName(LOADING_CONTAINER);
            if (container == null)
            {
                return "not found (no " + LOADING_FORM + "." + LOADING_CONTAINER + ")";
            }
            this.resetCounts();
            var renderersFound:int = 0;
            for each (var enemy:Boolean in SIDES)
            {
                var renderers:Object = ClientFields.loadingRenderers(form, enemy);
                var icons:Object = read(container, LOADING_ICONS[int(enemy)]);
                var names:Object = read(container, LOADING_NAMES[int(enemy)]);
                if (renderers == null || icons == null)
                {
                    continue;
                }
                for (var index:int = 0; index < renderers.length && index < icons.length; index++)
                {
                    renderersFound++;
                    var id:Number = ClientFields.loadingVehicleID(renderers[index]);
                    this.paintSlot(icons[index] as DisplayObject, id, names != null ? names[index] as DisplayObject : null, null);
                }
            }
            return "form._allyRenderers/_enemyRenderers " + renderersFound + ", " + this.counts();
        }

        private function paintSlot(icon:DisplayObject, id:Number, name:DisplayObject, frags:DisplayObject):void
        {
            if (icon == null || icon.parent == null || isNaN(id))
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
            decor.layout(this.anchor, this.row);
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
