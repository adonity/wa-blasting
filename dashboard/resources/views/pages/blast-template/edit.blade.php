<x-app-layout>
    @livewireStyles
        <link rel="stylesheet" href="{{ asset('/vendors/quill/quill.bubble.css') }}">
        <link rel="stylesheet" href="{{ asset('/vendors/quill/quill.snow.css') }}">
        <style>
        </style>
    @livewireStyles
    <x-slot name="header">
        <div class="row">
            <div class="col-12 col-md-6 order-md-1 order-first">
                <h3>{{ __("Edit Trigger") }}</h3>
                <p class="text-subtitle text-muted">{{ __("Edit trigger balas otoomatis") }}</p>
            </div>
            <div class="col-12 col-md-6 order-md-2 order-last">
            </div>
        </div>
    </x-slot>

    @if ($errors->count() > 0)
        <div class="alert alert-danger">
            <h4 class="alert-heading">{{ __("Error") }}</h4>
            <ul>
                @foreach ($errors->messages() as $key => $item)
                    @foreach ($item as $child)
                        <li>{{ $child }}</li>
                    @endforeach
                @endforeach
            </ul>
        </div>
    @endif
    
    <section class="section">
        <div class="row">
            <div class="col-12 col-md-12">
                <div class="card">
                    <div class="card-content">
                        <div class="card-body">
                            <form action="{{ route('autoreply.update', ['balas_otomati'=>$autoreply->id]) }}" method="post" class="form form-horizontal">
                                {{ csrf_field() }}
                                <div class="form-body">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <label>Device</label>
                                        </div>
                                        <div class="col-md-8">
                                            <div class="form-group has-icon-left">
                                                <div class="position-relative">
                                                    <select class="form-select" name="id_device" id="devices">
                                                        <option value="">{{__("Pilih Device")}}</option>
                                                        @foreach ($devices as $item)
                                                            <option value="{{ $item->id }}" {{$item->id == $autoreply->id_device ? "selected":""}}>{{ $item->name }} | {{ $item->number }} ({{ $item->status }})</option>
                                                        @endforeach
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <label>{{__("Trigger")}}</label>
                                        </div>
                                        <div class="col-md-8">
                                            <div class="form-group">
                                                <div class="position-relative">
                                                    <div id="text" style="height: 200px"></div>
                                                    <p class="muted mt-1"><small>* Tekan tombol kombinasi Super+. (Windows dan Titik) untuk emoji</small></p>
                                                    <textarea name="trigger" class="d-none form-control" id="trigger" rows="5" readonly></textarea>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-12">
                                            <hr>
                                            <p class=""><b>Reply</b></p>
                                        </div>
                                        <div class="col-md-4">
                                            <label>Tipe Pesan</label>
                                        </div>
                                        <div class="col-md-8">
                                            <div class="form-group has-icon-left">
                                                <div class="position-relative">
                                                    <select class="form-select" name="id_type" id="messagetypes" required>
                                                        <option value="">{{__("Tipe Pesan")}}</option>
                                                        @foreach ($messagetypes as $item)
                                                            <option value="{{ $item->id }}"  {{$item->id == $autoreply->id_type ? "selected":""}}>{{ $item->label }}</option>
                                                        @endforeach
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="container-fluid media-link d-none">
                                            <div class="row">
                                                <div class="col-md-4">
                                                    <label>Link</label>
                                                </div>
                                                <div class="col-md-8">
                                                    <div class="form-group has-icon-left">
                                                        <div class="position-relative">
                                                            <input type="text" name="link" class="form-control" placeholder="Link Gambar atau Video">
                                                            <div class="form-control-icon">
                                                                <i class="bi bi-link-45deg"></i>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <label>{{__("Pesan")}}</label>
                                        </div>
                                        <div class="col-md-8">
                                            <div class="form-group">
                                                <div class="position-relative">
                                                    <div id="text2" style="height: 200px"></div>
                                                    <p class="muted mt-1"><small>* Tekan tombol kombinasi Super+. (Windows dan Titik) untuk emoji</small></p>
                                                    <textarea name="text" class="form-control d-none" id="text_real" rows="5" readonly></textarea>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="container-fluid button-message d-none">
                                            <div class="row">
                                                <div class="col-md-4">
                                                    <label>{{__("Buttons")}}</label>
                                                </div>
                                                <div class="col-md-8">
                                                    <div class="border p-2">
                                                        <div class="d-flex">
                                                            <button type="button" class="btn btn-sm btn-success mb-2 ms-auto btn-add-btn"><i class="bi bi-plus-circle"></i> Add Button</button>
                                                        </div>
                                                        <div id="buttons">

                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="container-fluid footer-message d-none mt-3">
                                            <div class="row">
                                                <div class="col-md-4">
                                                    <label>{{__("Footer")}}</label>
                                                </div>
                                                <div class="col-md-8">
                                                    <div class="form-group">
                                                        <div class="position-relative">
                                                            <textarea name="footer" class="form-control" rows="2"></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="form-group col-md-8 offset-md-4">
                                            <div class="form-check">
                                                <div class="checkbox">
                                                    <input type="checkbox" name="status" id="multidevice" class="form-check-input" checked="" value="1">
                                                    <label for="multidevice">Status</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-12 d-flex justify-content-end">
                                            <a href="{{ url("/devices") }}" class="btn btn-light-secondary me-1 mb-1">Back</a>
                                            <button type="reset" class="btn btn-light-secondary me-1 mb-1">Reset</button>
                                            <button type="submit" class="btn btn-primary me-1 mb-1">Submit</button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    @livewireScripts
        <script src="{{ asset('/vendors/quill/quill.min.js') }}"></script>
    @livewireScripts
    <script>
        document.addEventListener('livewire:load', function () {
            const options = {
                placeholder: 'Tulis pesan yang akan dikirim...',
                modules: { 
                    toolbar: [
                        ["bold", "italic", "strike"], 
                    ]
                }, 
                theme: 'snow'
            };


            document.querySelector('.btn-add-btn').addEventListener("click", event  => {
                htmlText = `<div class="item-button d-flex border p-1">
                            <div class="p-1">
                                <input type="text" class="form-control form-control-sm" name="button_title[]" placeholder="{{__("Button Title")}}" aria-label="{{__("Button Title")}}">
                            </div>
                            <div class="p-1">
                                <select class="form-select form-select-sm" name="button_type[]" id="devices">
                                    <option value="">{{__("Choose Button Type")}}</option>
                                    <option value="normal">Quick Reply</option>
                                    <option value="call">Call</option>
                                    <option value="url">URL</option>
                                </select>
                            </div>
                            <div class="p-1 d-none">
                                <input type="text" class="form-control form-control-sm" name="button_url[]" placeholder="{{__("URL")}}" aria-label="{{__("Button URL")}}">
                            </div>
                            <div class="p-1 d-none">
                                <input type="text" class="form-control form-control-sm" name="button_phone[]" placeholder="{{__("Call Number")}}" aria-label="{{__("Button Phone Number")}}">
                            </div>
                            <div class="p-1">
                                <button type="button" class="btn btn-sm btn-danger btn-remove-btn"><i class="bi bi-trash-fill"></i></button>
                            </div>
                        </div>`;
                document.querySelector("#buttons").insertAdjacentHTML( 'beforeend', htmlText );
            })

            document.querySelector('.button-message').addEventListener("click", event  => {
                if(event.target.className.indexOf('btn-remove-btn') >= 0 || event.target.parentElement.className.indexOf('btn-remove-btn') >= 0 ){
                    event.target.closest(".item-button").remove()
                }
            })
            
            document.querySelector('.button-message').addEventListener("change", event => {
                console.log(event.target.value)
                if(event.target.name === "button_type[]"){
                    const value = event.target.value
                    const itemButton = event.target.closest(".item-button")
                    if(value === "url"){
                        itemButton.querySelector(`input[name="button_url[]"]`).parentElement.classList.remove("d-none");
                        itemButton.querySelector(`input[name="button_phone[]"]`).parentElement.classList.add("d-none");
                    }else if(value === "call"){
                        itemButton.querySelector(`input[name="button_url[]"]`).parentElement.classList.add("d-none");
                        itemButton.querySelector(`input[name="button_phone[]"]`).parentElement.classList.remove("d-none");
                    }else{
                        itemButton.querySelector(`input[name="button_url[]"]`).parentElement.classList.add("d-none");
                        itemButton.querySelector(`input[name="button_phone[]"]`).parentElement.classList.add("d-none");
                    }
                }
            })
            
            document.querySelector('#messagetypes').addEventListener("change", event => {
                const value = event.target.value
                
                switch (value) {
                    case "1":
                        document.querySelector(`.media-link`).classList.add("d-none");
                        document.querySelector(`.button-message`).classList.add("d-none");
                        document.querySelector(`.footer-message`).classList.add("d-none");
                        break;
                    case "4":
                        document.querySelector(`.media-link`).classList.add("d-none");
                        document.querySelector(`.button-message`).classList.remove("d-none");
                        document.querySelector(`.footer-message`).classList.remove("d-none");
                        break;
                    default:
                        document.querySelector(`.media-link`).classList.remove("d-none");
                        document.querySelector(`.button-message`).classList.add("d-none");
                        document.querySelector(`.footer-message`).classList.add("d-none");
                        break;
                }
            })

            document.querySelector('#messagetypes').dispatchEvent(new Event('change'))
            
            let snow = new Quill('#text', options);

            snow.on('text-change', function(delta, oldDelta, source) {
                const contents = snow.getContents();
                document.querySelector('#trigger').value = JSON.stringify(contents);
            });

            
            let snow2 = new Quill('#text2', options);

            snow2.on('text-change', function(delta, oldDelta, source) {
                const contents = snow2.getContents();
                document.querySelector('#text_real').value = JSON.stringify(contents);
            });

            const choices = new Choices(document.querySelector('#devices'));
            const choices2 = new Choices(document.querySelector('#messagetypes'));
        })
    </script>
</x-app-layout>
